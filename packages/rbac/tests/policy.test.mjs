import test from "node:test";
import assert from "node:assert/strict";
import { can, assertPermission, ForbiddenError, createRbacPolicy } from "../src/index.mjs";
const actor = {id:"user", organizationId:"org", departmentId:null, role:"ADMIN", isActive:true};
const scope = {organizationId:"org"};
test("core role matrix and organization boundary", () => {
 const permissions = ["dashboard:read","users:read","users:manage","departments:read","departments:manage","roles:assign"];
 const expected = {ADMIN:permissions,MANAGER:["dashboard:read","users:read","departments:read"],USER:["dashboard:read"]};
 for (const [role, allowed] of Object.entries(expected)) for (const permission of permissions) {
  assert.equal(can({...actor,role},permission,scope),allowed.includes(permission));
  assert.equal(can({...actor,role},permission,{organizationId:"other"}),false);
 }
});
test("untrusted principals and unknown actions never grant access", () => {
 for (const user of [null,undefined,{...actor,isActive:false},{...actor,isActive:1},{...actor,organizationId:""},{...actor,organizationId:" "},{...actor,role:"toString"},{...actor,role:"__proto__"}]) assert.equal(can(user,"dashboard:read",scope),false);
 assert.equal(can(actor,"unknown:manage",scope),false);
 assert.equal(can(actor,"equipment:manage",scope),false);
 assert.equal(can(actor,"dashboard:read",null),false);
 assert.throws(()=>assertPermission(null,"dashboard:read",scope),error=>error instanceof ForbiddenError && error.status===403);
 assertPermission(actor,"dashboard:read",scope);
});
test("explicit app extensions preserve core permissions and copy input", () => {
 const extensions = {ADMIN:["devices:manage"],MANAGER:["devices:read"],USER:["devices:read"]};
 const policy=createRbacPolicy(extensions);
 extensions.USER.push("devices:manage"); extensions.ADMIN.length=0;
 assert.equal(policy.can(actor,"devices:manage",scope),true);
 assert.equal(policy.can({...actor,role:"USER"},"devices:manage",scope),false);
 assert.equal(policy.can({...actor,role:"USER"},"devices:read",scope),true);
 assert.equal(policy.can(actor,"users:manage",scope),true);
 assert.equal(policy.can(actor,"devices:read",scope),false);
 assert.equal(policy.can(actor,"devices:manage",{organizationId:"other"}),false);
 assert.equal(can(actor,"devices:manage",scope),false);
 assert.throws(()=>policy.assertPermission({...actor,role:"USER"},"devices:manage",scope),ForbiddenError);
});
test("inherited configuration is ignored and malformed grants rejected", () => {
 const inherited=Object.create({USER:["devices:manage"]});
 assert.equal(createRbacPolicy(inherited).can({...actor,role:"USER"},"devices:manage",scope),false);
 for(const extra of [null,"users:manage",[42],[""]]) assert.throws(()=>createRbacPolicy({USER:extra}),TypeError);
});
