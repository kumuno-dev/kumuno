import test from "node:test";
import assert from "node:assert/strict";
import {transitionApproval,ApprovalError} from "../src/index.mjs";
const request={id:"request",organizationId:"org",requestedById:"owner",status:"DRAFT",version:0};
const owner={id:"owner",organizationId:"org",departmentId:null,role:"USER",isActive:true};
const reviewer={...owner,id:"reviewer",role:"MANAGER"};
const can=()=>true;
const command={action:"SUBMIT",expectedVersion:0};
const run=(record,who,cmd,permission=can)=>transitionApproval({request:record,actor:who,command:cmd,can:permission});
const rejects=(fn,code)=>assert.throws(fn,error=>error instanceof ApprovalError && error.code===code);
test("complete transition matrix includes resubmission and terminal approval",()=>{
 for(const status of ["DRAFT","PENDING","RETURNED","APPROVED"]) for(const action of ["SUBMIT","APPROVE","RETURN"]) {
  const cmd={action,expectedVersion:0,reason:"確認をお願いします"};
  const allowed=action==="SUBMIT" ? ["DRAFT","RETURNED"].includes(status) : status==="PENDING";
  if(allowed){const result=run({...request,status},action==="SUBMIT"?owner:reviewer,cmd);assert.equal(result.request.status,action==="SUBMIT"?"PENDING":action==="APPROVE"?"APPROVED":"RETURNED");assert.equal(result.request.version,1);}
  else rejects(()=>run({...request,status},action==="SUBMIT"?owner:reviewer,cmd),"INVALID_STATE");
 }
});
test("same-organization active principals cannot self-review or submit for others",()=>{
 const pending={...request,status:"PENDING"};
 for(const role of ["ADMIN","MANAGER","USER"]) {
  rejects(()=>run(pending,{...owner,role},{action:"APPROVE",expectedVersion:0}),"FORBIDDEN");
  rejects(()=>run(pending,{...owner,role},{action:"RETURN",expectedVersion:0,reason:"確認"}),"FORBIDDEN");
  rejects(()=>run(request,{...reviewer,role},command),"FORBIDDEN");
 }
 for(const who of [null,{...owner,isActive:false},{...owner,isActive:1},{...owner,role:"toString"},{...owner,organizationId:"other"},{...owner,id:""}]) rejects(()=>run(request,who,command),"FORBIDDEN");
 for(const permission of [()=>false,()=>undefined,()=>"true",()=>Promise.resolve(true),undefined]) rejects(()=>transitionApproval({request,actor:owner,command,can:permission}),"FORBIDDEN");
});
test("explicit permissions and target organization are passed to authorization",()=>{
 const calls=[];const permission=(...args)=>{calls.push(args);return true;};
 run(request,owner,command,permission);run({...request,status:"PENDING"},reviewer,{action:"APPROVE",expectedVersion:0},permission);
 assert.deepEqual(calls.map(c=>c.slice(1)),[["approval:submit",{organizationId:"org"}],["approval:review",{organizationId:"org"}]]);
});
test("expected version is mandatory and transitions do not mutate input",()=>{
 rejects(()=>run({...request,version:1},owner,command),"CONFLICT");
 const frozen=Object.freeze({...request,extra:"not copied"});
 const result=run(frozen,owner,Object.freeze(command));
 assert.deepEqual(result.request,{...request,status:"PENDING",version:1});assert.equal(frozen.status,"DRAFT");assert.equal(result.actorId,owner.id);assert.equal(result.reason,null);
 for(const expectedVersion of [undefined,-1,1.5,NaN,Number.MAX_SAFE_INTEGER+1]) rejects(()=>run(request,owner,{action:"SUBMIT",expectedVersion}),"INVALID_COMMAND");
});
test("return reasons are trimmed, required and bounded without leaking input",()=>{
 const pending={...request,status:"PENDING"};
 const returned=run(pending,reviewer,{action:"RETURN",expectedVersion:0,reason:"  再確認  "});assert.equal(returned.reason,"再確認");
 assert.equal(run(pending,reviewer,{action:"RETURN",expectedVersion:0,reason:"a".repeat(1000)}).reason.length,1000);
 for(const reason of [null,undefined,""," ",42,"private".repeat(200)]) rejects(()=>run(pending,reviewer,{action:"RETURN",expectedVersion:0,reason}),"INVALID_COMMAND");
 assert.equal(new ApprovalError("INVALID_COMMAND").message.includes("private"),false);
});
test("invalid records, unknown actions and version overflow are rejected",()=>{
 for(const invalid of [null,{...request,id:""},{...request,organizationId:" "},{...request,requestedById:""},{...request,status:"toString"},{...request,version:-1},{...request,version:Number.MAX_SAFE_INTEGER}]) rejects(()=>run(invalid,owner,command),"INVALID_REQUEST");
 rejects(()=>run(request,owner,{action:"CANCEL",expectedVersion:0}),"INVALID_COMMAND");
 assert.equal(new ApprovalError("FORBIDDEN").status,403);assert.equal(new ApprovalError("CONFLICT").status,409);
});
