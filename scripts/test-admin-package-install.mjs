import {execFileSync} from "node:child_process";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const fixture=await mkdtemp(join(tmpdir(),"kumuno-admin-consumer-"));
const run=(command,args)=>execFileSync(command,args,{cwd:fixture,stdio:"pipe",timeout:120000,env:{...process.env,npm_config_cache:join(fixture,"npm-cache")}});
try {
 await writeFile(join(fixture,"package.json"),JSON.stringify({name:"admin-consumer",version:"1.0.0",private:true,type:"module"}));
 run("npm",["install","--ignore-scripts","--no-audit","--no-fund",join(root,"templates/default/vendor/kumuno-admin-0.1.0-rc.0.tgz")]);
 run("npm",["install","--ignore-scripts","--no-audit","--no-fund","--save-exact","react@19.3.0","react-dom@19.3.0","@types/react@19.3.0"]);
 await writeFile(join(fixture,"verify.mjs"),`import assert from 'node:assert/strict';
import {UserFields,DepartmentFields} from '@kumuno/admin';import {ManagementForm} from '@kumuno/admin/form';import {createElement as h} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createRequire} from 'node:module';
assert.equal(createRequire(import.meta.url)('@kumuno/admin').UserFields,UserFields);
assert.equal(typeof ManagementForm,'function');assert.equal(typeof DepartmentFields,'function');
assert(renderToStaticMarkup(h(UserFields,{departments:[]})).includes('name="password"'));
`);
 run(process.execPath,["verify.mjs"]);
 await writeFile(join(fixture,"verify-rsc.mjs"),`import assert from 'node:assert/strict';import {UserFields,DepartmentFields} from '@kumuno/admin';assert.equal(UserFields({departments:[]}).type,'div');assert.equal(DepartmentFields({departments:[]}).type,'div');`);
 run(process.execPath,["--conditions=react-server","verify-rsc.mjs"]);
 await writeFile(join(fixture,"verify.mts"),`import {UserFields,type UserFieldsValue,type AdminFormState} from '@kumuno/admin';import {ManagementForm} from '@kumuno/admin/form';
UserFields({departments:[]});ManagementForm({children:null,action:async (_state:AdminFormState,_form:FormData)=>({success:'saved'})});
// @ts-expect-error unknown roles are not a user field contract
const badRole:UserFieldsValue['role']='SUPERUSER';void badRole;
// @ts-expect-error action must return the form state
ManagementForm({children:null,action:async()=>123});
`);
 run(process.execPath,[join(root,"templates/default/node_modules/typescript/bin/tsc"),"--noEmit","--strict","--skipLibCheck","--module","nodenext","--moduleResolution","nodenext","--target","es2022","verify.mts"]);
 console.log('Independent @kumuno/admin tgz installation, React rendering, runtime imports and TypeScript public contract verified.');
} catch(error) {
 console.error('Independent admin install failed. Fixture retained:',fixture);console.error(error.message);
 if(error.stdout)console.error(error.stdout.toString().slice(-2000));process.exitCode=1;
} finally {if(!process.exitCode)await rm(fixture,{recursive:true,force:true});}
