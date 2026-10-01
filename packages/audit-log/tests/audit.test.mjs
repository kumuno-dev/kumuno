import test from "node:test";
import assert from "node:assert/strict";
import { appendAuditLog, validateAuditEvent } from "../src/index.mjs";
const actor={id:"actor",organizationId:"org"};
const base={resourceType:"Device",resourceId:"device"};
test("create/update/delete enforce change shape before calling the writer",async()=>{
 for(const event of [{action:"CREATE",after:{}},{action:"UPDATE",before:{},after:{}},{action:"DELETE",before:{}}]) {
  validateAuditEvent(event);
  let saved;const result=await appendAuditLog(async entry=>{saved=entry;return {id:"audit"};},actor,{...base,...event});
  assert.deepEqual(result,{id:"audit"});
  assert.equal(saved.organizationId,"org");assert.equal(saved.userId,"actor");
  assert.equal(saved.action,event.action);assert.deepEqual(saved.metadata,{version:1});
  assert.deepEqual(saved.before,event.before);assert.deepEqual(saved.after,event.after);
 }
 let calls=0;
 for(const event of [{action:"OTHER",after:{}},{action:"CREATE",before:{},after:{}},{action:"CREATE"},{action:"UPDATE",after:{}},{action:"UPDATE",before:{}},{action:"DELETE",before:{},after:{}},{action:"DELETE"}]) {
  await assert.rejects(appendAuditLog(async()=>calls++,actor,{...base,...event}),TypeError);
 }
 assert.equal(calls,0);
});
test("copies only the common record and detaches projected snapshots",async()=>{
 const after={status:"READY",nested:{values:[1,null,true]}};
 let saved;await appendAuditLog(async entry=>{saved=entry;}, {...actor,email:"private"},
  {...base,action:"CREATE",after,metadata:{password:"secret"},timestamp:"forged",password:"secret"});
 after.nested.values.push("changed");
 assert.deepEqual(saved.after,{status:"READY",nested:{values:[1,null,true]}});
 assert.deepEqual(Object.keys(saved).sort(),["organizationId","userId","action","resourceType","resourceId","metadata","before","after"].sort());
 assert.equal(JSON.stringify(saved).includes("secret"),false);
 assert.equal(JSON.stringify(saved).includes("private"),false);
});
test("rejects missing identities and non-JSON snapshots without invoking writer",async()=>{
 let calls=0;const write=async()=>calls++;
 for(const who of [null,{...actor,id:""},{...actor,organizationId:" "}]) await assert.rejects(appendAuditLog(write,who,{...base,action:"CREATE",after:{}}),TypeError);
 for(const key of ["resourceType","resourceId"]) await assert.rejects(appendAuditLog(write,actor,{...base,[key]:"",action:"CREATE",after:{}}),TypeError);
 const circular={};circular.self=circular;
 for(const after of [null,[],"text",{value:undefined},{value:NaN},{value:Infinity},{value:1n},{value:()=>{}},{value:new Date()},circular]) await assert.rejects(appendAuditLog(write,actor,{...base,action:"CREATE",after}),TypeError);
 assert.equal(calls,0);
});
test("does not invoke toJSON and handles shared references and prototype keys",async()=>{
 let called=false;
 await assert.rejects(appendAuditLog(async()=>{},actor,{...base,action:"CREATE",after:{toJSON(){called=true;return {};}}}),TypeError);
 assert.equal(called,false);
 const shared={valid:true};const after={a:shared,b:shared,...JSON.parse('{"__proto__":{"polluted":true}}')};
 const saved=await appendAuditLog(async entry=>entry,actor,{...base,action:"CREATE",after});
 assert.deepEqual(saved.after,after);assert.equal({}.polluted,undefined);
});
test("awaits the transaction writer and propagates its exact failure",async()=>{
 const failure=new Error("audit insert failed");let completed=false;
 await assert.rejects(appendAuditLog(async()=>{await Promise.resolve();completed=true;throw failure;},actor,{...base,action:"CREATE",after:{}}),error=>error===failure);
 assert.equal(completed,true);
});
