import {requireTestDatabaseUrl} from "./verify-generated-database.mjs";
const withDatabase=process.argv.includes("--db");
if(withDatabase)requireTestDatabaseUrl(process.env.TEST_DATABASE_URL);
import {execFileSync} from "node:child_process";
import {mkdtemp,writeFile,rm,cp,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url)),fixture=await mkdtemp(join(tmpdir(),"kumuno-approval-consumer-"));
const run=(command,args)=>execFileSync(command,args,{cwd:fixture,stdio:"pipe",timeout:120000});
try {
 await writeFile(join(fixture,"package.json"),JSON.stringify({name:"approval-consumer",version:"1.0.0",private:true,type:"module"}));
 const archives=["approval","rbac","audit-log"].map(name=>join(root,"templates/default/vendor/kumuno-"+name+"-0.1.0-rc.0.tgz"));
 if(withDatabase){const manifest=JSON.parse(await readFile(join(root,"templates/default/package.json"),"utf8"));archives.push("pg@"+manifest.dependencies.pg);}
 run("npm",["install","--ignore-scripts","--no-audit","--no-fund",...archives]);
 await writeFile(join(fixture,"verify.mjs"),`import assert from 'node:assert/strict';
import {transitionApproval,ApprovalError} from '@kumuno/approval';
import {createRbacPolicy} from '@kumuno/rbac';
import {appendAuditLog} from '@kumuno/audit-log';
import {createRequire} from 'node:module';
assert.equal(createRequire(import.meta.url)('@kumuno/approval').ApprovalError,ApprovalError);
const actor={id:'owner',organizationId:'org',departmentId:null,role:'USER',isActive:true};
const request={id:'request',organizationId:'org',requestedById:'owner',status:'DRAFT',version:0};
const policy=createRbacPolicy({USER:['approval:submit'],MANAGER:['approval:review']});
const result=transitionApproval({request,actor,can:policy.can,command:{action:'SUBMIT',expectedVersion:0}});
assert.equal(result.request.status,'PENDING');
const log=await appendAuditLog(async row=>row,actor,{action:'UPDATE',resourceType:'ApprovalRequest',resourceId:request.id,before:{status:request.status,version:request.version},after:{status:result.request.status,version:result.request.version}});
assert.equal(log.after.version,1);
`);
 run(process.execPath,["verify.mjs"]);
 await writeFile(join(fixture,"verify.mts"),`import {transitionApproval,type ApprovalRequest} from '@kumuno/approval';
import {createRbacPolicy} from '@kumuno/rbac';
const request:ApprovalRequest={id:'request',organizationId:'org',requestedById:'owner',status:'DRAFT',version:0};
const actor={id:'owner',organizationId:'org',departmentId:null,role:'USER' as const,isActive:true};
const policy=createRbacPolicy({USER:['approval:submit'],MANAGER:['approval:review']});
transitionApproval({request,actor,can:policy.can,command:{action:'SUBMIT',expectedVersion:0}});
// @ts-expect-error return reason is mandatory
transitionApproval({request,actor,can:policy.can,command:{action:'RETURN',expectedVersion:0}});
// @ts-expect-error unsupported command
transitionApproval({request,actor,can:policy.can,command:{action:'CANCEL',expectedVersion:0}});
// @ts-expect-error caller must provide an explicit policy
transitionApproval({request,actor,command:{action:'SUBMIT',expectedVersion:0}});
`);
 run(process.execPath,[join(root,"templates/default/node_modules/typescript/bin/tsc"),"--noEmit","--strict","--skipLibCheck","--module","nodenext","--moduleResolution","nodenext","--target","es2022","verify.mts"]);
 if(withDatabase){
  for(const name of ["transaction.mjs","verify-database.mjs"])await cp(join(root,"examples/approval",name),join(fixture,name));
  run(process.execPath,["verify-database.mjs"]);
  console.log("Approval independent PostgreSQL transaction integration verified.");
 }
 console.log('Independent @kumuno/approval tgz installation, runtime imports and TypeScript public contract verified.');
} catch(error) {
 console.error('Independent approval install failed. Fixture retained:',fixture);
 if(error.stdout)console.error(error.stdout.toString().slice(-2000));
 process.exitCode=1;
} finally {if(!process.exitCode)await rm(fixture,{recursive:true,force:true});}
