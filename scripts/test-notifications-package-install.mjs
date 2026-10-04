import {execFileSync} from "node:child_process";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const fixture=await mkdtemp(join(tmpdir(),"kumuno-notifications-consumer-"));
const run=(command,args)=>execFileSync(command,args,{cwd:fixture,stdio:"pipe",timeout:120000,env:{...process.env,npm_config_cache:join(fixture,"npm-cache")}});
try {
 await writeFile(join(fixture,"package.json"),JSON.stringify({name:"notifications-consumer",version:"1.0.0",private:true,type:"module"}));
 run("npm",["install","--ignore-scripts","--no-audit","--no-fund",join(root,"templates/default/vendor/kumuno-notifications-0.1.0-rc.0.tgz")]);
 await writeFile(join(fixture,"verify.mjs"),`import assert from 'node:assert/strict';
import {publishNotification} from '@kumuno/notifications';import {createRequire} from 'node:module';
assert.equal(createRequire(import.meta.url)('@kumuno/notifications').publishNotification,publishNotification);
const actor={id:'u',organizationId:'o',isActive:true};
const entry=await publishNotification(async value=>value,actor,actor,{key:'1',title:'完了',message:'登録完了',href:'/dashboard'});
assert.equal(entry.recipientId,'u');
`);
 run(process.execPath,["verify.mjs"]);
 await writeFile(join(fixture,"verify.mts"),`import {publishNotification,type NotificationEntry} from '@kumuno/notifications';
const actor={id:'u',organizationId:'o',isActive:true};
const result:Promise<NotificationEntry>=publishNotification(async value=>value,actor,actor,{key:'1',title:'完了',message:'登録完了',href:'/dashboard'});void result;
// @ts-expect-error raw models cannot be notification text
publishNotification(async value=>value,actor,actor,{key:'1',title:{password:'secret'},message:'a',href:'/dashboard'});
`);
 run(process.execPath,[join(root,"templates/default/node_modules/typescript/bin/tsc"),"--noEmit","--strict","--skipLibCheck","--module","nodenext","--moduleResolution","nodenext","--target","es2022","verify.mts"]);
 console.log('Independent @kumuno/notifications tgz installation, runtime imports and TypeScript public contract verified.');
} catch(error) {
 console.error('Independent notifications install failed. Fixture retained:',fixture);console.error(error.message);
 if(error.stdout)console.error(error.stdout.toString().slice(-2000));process.exitCode=1;
} finally {if(!process.exitCode)await rm(fixture,{recursive:true,force:true});}
