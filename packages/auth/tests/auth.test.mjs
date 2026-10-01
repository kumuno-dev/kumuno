import {test} from "node:test";
import assert from "node:assert/strict";
import {getAuthConfig,createKumunoAuthentication,handleAuthentication} from "../src/index.mjs";
const config=getAuthConfig({BETTER_AUTH_URL:"http://localhost:3000",BETTER_AUTH_SECRET:"a".repeat(40)});
test("configuration rejects weak secrets, remote HTTP and credentials without leaking their values",()=>{
 for(const env of [{},{BETTER_AUTH_SECRET:"secret",BETTER_AUTH_URL:"https://example.com"},{BETTER_AUTH_SECRET:"a".repeat(40),BETTER_AUTH_URL:"http://example.com"},{BETTER_AUTH_SECRET:"a".repeat(40),BETTER_AUTH_URL:"https://person:password@example.com"}]) assert.throws(()=>getAuthConfig(env));
 assert.equal(getAuthConfig({BETTER_AUTH_SECRET:"a".repeat(40),BETTER_AUTH_URL:"https://example.com"}).secureCookies,true);
});
test("session hook calls the supplied active-user lookup and fails closed",async()=>{
 let active=true,seen;
 const auth=createKumunoAuthentication({database:()=>({}),config,findUserAccess:async id=>{seen=id;return {isActive:active};}});
 const hook=auth.options.databaseHooks.session.create.before;
 await hook({userId:"test-user"});assert.equal(seen,"test-user");
 active=false;await assert.rejects(hook({userId:"test-user"}));
 const unavailable=createKumunoAuthentication({database:()=>({}),config,findUserAccess:async()=>{throw Error("connection failed");}});
 await assert.rejects(unavailable.options.databaseHooks.session.create.before({userId:"test-user"}));
});
test("unsupported routes, foreign origins and oversized bodies never call Better Auth",async()=>{
 let calls=0;const auth={handler:async()=>{calls++;return new Response("{}");}};
 const make=(path,method="POST",origin=config.baseURL,body="{}")=>new Request(config.baseURL+path,{method,headers:{Origin:origin},...(method==="POST"?{body}:{})});
 assert.equal((await handleAuthentication(make("/api/auth/sign-up/email"),auth,config)).status,404);
 assert.equal((await handleAuthentication(make("/api/auth/sign-in/email","GET"),auth,config)).status,404);
 assert.equal((await handleAuthentication(make("/api/auth/sign-in/email","POST","https://other.example"),auth,config)).status,403);
 assert.equal((await handleAuthentication(make("/api/auth/sign-in/email","POST",config.baseURL,"x".repeat(8193)),auth,config)).status,413);
 assert.equal(calls,0);
});
test("HTTP facade preserves cookies and retry status, removes secrets and normalizes proxy IP",async()=>{
 let input;
 const auth={handler:async req=>{input=req;return new Response(JSON.stringify({token:"must-not-leak",rawError:"private"}),{status:429,headers:{"Set-Cookie":"test=opaque; HttpOnly","X-Retry-After":"60"}});}};
 const request=new Request(config.baseURL+"/api/auth/sign-in/email",{method:"POST",headers:{Origin:config.baseURL,"X-Kumuno-Client-IP":"1.2.3.4","X-Real-IP":"not-an-ip"},body:"{}"});
 const response=await handleAuthentication(request,auth,{...config,ipHeader:"x-real-ip"});
 assert.equal(input.headers.get("x-kumuno-client-ip"),"127.0.0.1");
 assert.equal(response.status,429);assert.equal(response.headers.get("retry-after"),"60");assert(response.headers.get("set-cookie"));assert.equal(response.headers.get("cache-control"),"no-store");assert(!JSON.stringify(await response.json()).includes("must-not-leak"));
});
