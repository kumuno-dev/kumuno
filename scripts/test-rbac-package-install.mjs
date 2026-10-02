import {execFileSync} from "node:child_process";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const fromRegistry=process.argv.includes("--registry");
const root=fileURLToPath(new URL("../",import.meta.url)),fixture=await mkdtemp(join(tmpdir(),"kumuno-rbac-consumer-"));
const run=(command,args)=>execFileSync(command,args,{cwd:fixture,stdio:"pipe",timeout:120000,env:{...process.env,npm_config_cache:join(fixture,"npm-cache")}});
try {
 await writeFile(join(fixture,"package.json"),JSON.stringify({name:"rbac-consumer",version:"1.0.0",private:true,type:"module"}));
 run("npm",["install","--ignore-scripts","--no-audit","--no-fund",fromRegistry ? "@kumuno/rbac@0.1.0-rc.0" : join(root,"templates/default/vendor/kumuno-rbac-0.1.0-rc.0.tgz")]);
 await writeFile(join(fixture,"verify.mjs"),`import assert from 'node:assert/strict';
import {can,createRbacPolicy,ForbiddenError} from '@kumuno/rbac';
import {createRequire} from 'node:module';
assert.equal(createRequire(import.meta.url)('@kumuno/rbac').ForbiddenError,ForbiddenError);
const user={id:'a',organizationId:'org',departmentId:null,role:'ADMIN',isActive:true};
assert.equal(can(user,'users:manage',{organizationId:'other'}),false);
const policy=createRbacPolicy({USER:['devices:read']});
assert.equal(policy.can({...user,role:'USER'},'devices:read',{organizationId:'org'}),true);
assert.throws(()=>policy.assertPermission({...user,isActive:false},'users:manage',{organizationId:'org'}),ForbiddenError);
`);
 run(process.execPath,["verify.mjs"]);
 await writeFile(join(fixture,"verify.mts"),`import {assertPermission,createRbacPolicy,type Principal,type Permission,type RbacPolicy} from '@kumuno/rbac';
let actor:Principal|null=JSON.parse('null');
assertPermission(actor,'dashboard:read',{organizationId:'org'});
const id:string=actor.id;
void id;
const policy:RbacPolicy<Permission|'devices:read'>=createRbacPolicy({USER:['devices:read']});
policy.assertPermission(actor,'devices:read',{organizationId:'org'});
// @ts-expect-error unknown core permission
assertPermission(actor,'unknown:manage',{organizationId:'org'});
// @ts-expect-error unknown application permission
policy.can(actor,'devices:manage',{organizationId:'org'});
const inferred = createRbacPolicy({USER:['devices:read']});
// @ts-expect-error inferred permissions must remain an explicit union
inferred.can(actor,'devices:manage',{organizationId:'org'});
// @ts-expect-error unknown role configuration
createRbacPolicy({SUPERUSER:['devices:read']});
`);
 run(process.execPath,[join(root,"templates/default/node_modules/typescript/bin/tsc"),"--noEmit","--strict","--skipLibCheck","--module","nodenext","--moduleResolution","nodenext","--target","es2022","verify.mts"]);
 console.log('Independent @kumuno/rbac tgz installation, runtime imports and TypeScript public contract verified.');
} catch(error) {
 console.error('Independent rbac install failed. Fixture retained:',fixture);
 if(error.stdout)console.error(error.stdout.toString().slice(-2000));
 process.exitCode=1;
} finally {if(!process.exitCode)await rm(fixture,{recursive:true,force:true});}
