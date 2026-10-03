import {execFileSync} from "node:child_process";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const fixture=await mkdtemp(join(tmpdir(),"kumuno-csv-consumer-"));
const run=(command,args)=>execFileSync(command,args,{cwd:fixture,stdio:"pipe",timeout:120000,env:{...process.env,npm_config_cache:join(fixture,"npm-cache")}});
try {
 await writeFile(join(fixture,"package.json"),JSON.stringify({name:"csv-consumer",version:"1.0.0",private:true,type:"module"}));
 run("npm",["install","--ignore-scripts","--no-audit","--no-fund",join(root,"templates/default/vendor/kumuno-csv-0.1.0-rc.0.tgz")]);
 await writeFile(join(fixture,"verify.mjs"),`import assert from 'node:assert/strict';
import {parseCsv,stringifyCsv,CsvError} from '@kumuno/csv';
import {createRequire} from 'node:module';
assert.equal(createRequire(import.meta.url)('@kumuno/csv').parseCsv,parseCsv);
const csv=stringifyCsv({headers:['番号','機器名'],rows:[['001','輸液ポンプ']]});
assert.deepEqual(parseCsv(csv),[['番号','機器名'],['001','輸液ポンプ']]);
assert.throws(()=>stringifyCsv({headers:['番号'],rows:[['=cmd']]}),CsvError);
`);
 run(process.execPath,["verify.mjs"]);
 await writeFile(join(fixture,"verify.mts"),`import {parseCsv,stringifyCsv,type CsvLimits} from '@kumuno/csv';
const limits:CsvLimits={maxRows:10};const rows:string[][]=parseCsv('a',limits);
stringifyCsv({headers:['列'],rows});
// @ts-expect-error raw models are not CSV cells
stringifyCsv({headers:['列'],rows:[[{password:'secret'}]]});
// @ts-expect-error no arbitrary export options
stringifyCsv({headers:['列'],rows:[]},{unsafe:true});
`);
 run(process.execPath,[join(root,"templates/default/node_modules/typescript/bin/tsc"),"--noEmit","--strict","--skipLibCheck","--module","nodenext","--moduleResolution","nodenext","--target","es2022","verify.mts"]);
 console.log('Independent @kumuno/csv tgz installation, runtime imports and TypeScript public contract verified.');
} catch(error) {
 console.error('Independent CSV install failed. Fixture retained:',fixture);console.error(error.message);
 if(error.stdout)console.error(error.stdout.toString().slice(-2000));process.exitCode=1;
} finally {if(!process.exitCode)await rm(fixture,{recursive:true,force:true});}
