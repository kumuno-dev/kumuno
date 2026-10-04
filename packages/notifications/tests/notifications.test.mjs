import test from "node:test";
import assert from "node:assert/strict";
import {publishNotification} from "../src/index.mjs";
const actor={id:"user-1",organizationId:"org-1",isActive:true};
const event={key:"import:1",title:"登録完了",message:"2台を登録しました。",href:"/dashboard/medical-equipment?availability=pending"};
test("projects only explicit notification attributes and preserves plain text",async()=>{
 let saved;const result=await publishNotification(async entry=>{saved=entry;return "id";},actor,actor,{...event,title:"<script>example</script>",password:"secret"});
 assert.equal(result,"id");assert.equal(saved.recipientId,actor.id);assert.equal(saved.organizationId,actor.organizationId);assert.equal(saved.title,"<script>example</script>");assert(!Object.hasOwn(saved,"password"));
});
test("refuses foreign or inactive principals before writing",async()=>{
 let writes=0;const write=async()=>{writes++;};
 for(const recipient of [{...actor,organizationId:"other"},{...actor,isActive:false}])await assert.rejects(publishNotification(write,actor,recipient,event),TypeError);
 await assert.rejects(publishNotification(write,{...actor,isActive:false},actor,event),TypeError);assert.equal(writes,0);
});
test("rejects unsafe destinations and invalid fields",async()=>{
 for(const href of ["https://other.test","//other.test","javascript:alert(1)","/login","/dashboard/../login","/dashboard/%2e%2e/login","/dashboard/\\other","/dashboard/\nother"])await assert.rejects(publishNotification(async()=>{},actor,actor,{...event,href}),TypeError);
 for(const patch of [{title:""},{message:"x".repeat(1001)},{key:"x".repeat(201)},{title:{secret:true}}])await assert.rejects(publishNotification(async()=>{},actor,actor,{...event,...patch}),TypeError);
});
test("propagates writer failure without a successful delivery",async()=>{
 const error=new Error("test failure");await assert.rejects(publishNotification(async()=>{throw error;},actor,actor,event),value=>value===error);
});
