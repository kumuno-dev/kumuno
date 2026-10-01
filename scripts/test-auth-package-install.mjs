import {execFileSync} from "node:child_process";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url)),fixture=await mkdtemp(join(tmpdir(),"kumuno-auth-consumer-"));
const run=(command,args)=>execFileSync(command,args,{cwd:fixture,stdio:"pipe",timeout:120000});
try {
 await writeFile(join(fixture,"package.json"),JSON.stringify({name:"auth-consumer",version:"1.0.0",private:true,type:"module"}));
 run("npm",["install","--ignore-scripts","--no-audit","--no-fund",join(root,"templates/default/vendor/kumuno-auth-0.1.0-rc.0.tgz"),"better-auth@1.7.6"]);
 await writeFile(join(fixture,"verify.mjs"),`import assert from 'node:assert/strict';
import {createKumunoAuthentication,getAuthConfig,handleAuthentication} from '@kumuno/auth';
const config=getAuthConfig({BETTER_AUTH_URL:'http://localhost:3000',BETTER_AUTH_SECRET:'a'.repeat(40)});
const auth=createKumunoAuthentication({config,database:()=>({transaction:async fn=>fn({})}),findUserAccess:async()=>({isActive:false})});
await assert.rejects(auth.options.databaseHooks.session.create.before({userId:'test'}));
assert.equal((await handleAuthentication(new Request('http://localhost:3000/api/auth/sign-up/email',{method:'POST',headers:{Origin:config.baseURL},body:'{}'}),auth,config)).status,404);
`);
 run(process.execPath,["verify.mjs"]);
 await writeFile(join(fixture,"verify.mts"),`import {createKumunoAuthentication,getAuthConfig} from '@kumuno/auth';
const auth=createKumunoAuthentication({config:getAuthConfig(),database:()=>({} as never),findUserAccess:async id=>({isActive:id.length>0})});
const session=await auth.api.getSession({headers:new Headers()});
const organization:string|undefined=session?.user.organizationId;
void organization;
// @ts-expect-error an app must provide authoritative active-user lookup
createKumunoAuthentication({config:getAuthConfig(),database:()=>({} as never)});
`);
 run(process.execPath,[join(root,"templates/default/node_modules/typescript/bin/tsc"),"--noEmit","--strict","--skipLibCheck","--module","nodenext","--moduleResolution","nodenext","--target","es2022","verify.mts"]);
 console.log('Independent @kumuno/auth tgz installation, runtime imports and TypeScript public contract verified.');
} catch(error) {
 console.error('Independent auth install failed. Fixture retained:',fixture);
 if(error.stdout)console.error(error.stdout.toString().slice(-2000));
 process.exitCode=1;
} finally {if(!process.exitCode)await rm(fixture,{recursive:true,force:true});}
