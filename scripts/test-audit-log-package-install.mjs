import {execFileSync} from "node:child_process";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const fromRegistry=process.argv.includes("--registry");
const root=fileURLToPath(new URL("../",import.meta.url)),fixture=await mkdtemp(join(tmpdir(),"kumuno-audit-log-consumer-"));
const run=(command,args)=>execFileSync(command,args,{cwd:fixture,stdio:"pipe",timeout:120000,env:{...process.env,npm_config_cache:join(fixture,"npm-cache")}});
try {
 await writeFile(join(fixture,"package.json"),JSON.stringify({name:"audit-log-consumer",version:"1.0.0",private:true,type:"module"}));
 run("npm",["install","--ignore-scripts","--no-audit","--no-fund",fromRegistry ? "@kumuno/audit-log@0.1.0-rc.0" : join(root,"templates/default/vendor/kumuno-audit-log-0.1.0-rc.0.tgz")]);
 await writeFile(join(fixture,"verify.mjs"),`import assert from 'node:assert/strict';
import {appendAuditLog,validateAuditEvent} from '@kumuno/audit-log';
import {createRequire} from 'node:module';
assert.equal(createRequire(import.meta.url)('@kumuno/audit-log').appendAuditLog,appendAuditLog);
const actor={id:'actor',organizationId:'org'};
const event={action:'CREATE',resourceType:'Device',resourceId:'device',after:{status:'READY'}};
const entry=await appendAuditLog(async row=>row,actor,event);
assert.deepEqual(entry.metadata,{version:1});assert.equal(entry.userId,'actor');
assert.throws(()=>validateAuditEvent({...event,before:{}}));
const failure=new Error('insert failed');
await assert.rejects(appendAuditLog(async()=>{throw failure;},actor,event),error=>error===failure);
`);
 run(process.execPath,["verify.mjs"]);
 await writeFile(join(fixture,"verify.mts"),`import {appendAuditLog,type AuditEntry} from '@kumuno/audit-log';
const actor={id:'actor',organizationId:'org'};
const result=await appendAuditLog(async (entry:AuditEntry)=>({id:'audit',user:entry.userId}),actor,
  {action:'CREATE',resourceType:'Device',resourceId:'device',after:{nested:[1,null,true]}});
const id:string=result.id;void id;
// @ts-expect-error unknown action
appendAuditLog(async row=>row,actor,{action:'OTHER',resourceType:'Device',resourceId:'device',after:{}});
// @ts-expect-error snapshot must be projected JSON, not Date
appendAuditLog(async row=>row,actor,{action:'CREATE',resourceType:'Device',resourceId:'device',after:{at:new Date()}});
// @ts-expect-error actor organization is required
appendAuditLog(async row=>row,{id:'actor'},{action:'CREATE',resourceType:'Device',resourceId:'device',after:{}});
`);
 run(process.execPath,[join(root,"templates/default/node_modules/typescript/bin/tsc"),"--noEmit","--strict","--skipLibCheck","--module","nodenext","--moduleResolution","nodenext","--target","es2022","verify.mts"]);
 console.log('Independent @kumuno/audit-log tgz installation, runtime imports and TypeScript public contract verified.');
} catch(error) {
 console.error('Independent audit-log install failed. Fixture retained:',fixture);
 if(error.stdout)console.error(error.stdout.toString().slice(-2000));
 process.exitCode=1;
} finally {if(!process.exitCode)await rm(fixture,{recursive:true,force:true});}
