import {createRequire} from "node:module";
import {createServer} from "node:http";
import {execFileSync} from "node:child_process";
import {mkdtemp,writeFile,rm,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const fromRegistry=process.argv.includes("--registry");
const root=fileURLToPath(new URL("../",import.meta.url)),fixture=await mkdtemp(join(tmpdir(),"kumuno-print-consumer-"));
const run=(command,args)=>execFileSync(command,args,{cwd:fixture,stdio:"pipe",timeout:120000,env:{...process.env,npm_config_cache:join(fixture,"npm-cache")}});
try {
 await writeFile(join(fixture,"package.json"),JSON.stringify({name:"print-consumer",version:"1.0.0",private:true,type:"module"}));
 run("npm",["install","--ignore-scripts","--no-audit","--no-fund",fromRegistry ? "@kumuno/print@0.1.0-rc.0" : join(root,"templates/default/vendor/kumuno-print-0.1.0-rc.0.tgz")]);
 await writeFile(join(fixture,"verify.mjs"),`import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {renderPrintDocument,PRINT_SCRIPT,PRINT_HEADERS} from '@kumuno/print';
import {createRequire} from 'node:module';
assert.equal(createRequire(import.meta.url)('@kumuno/print').PRINT_SCRIPT,PRINT_SCRIPT);
const data={title:'医療機器 台帳票',subtitle:'テスト用の機器情報',fields:[{label:'機器名',value:'試用輸液ポンプ'},{label:'管理番号',value:'ME-PRINT-001'},{label:'備考',value:'<img src="https://invalid.test/exfil" onerror="window.compromised=true">'}],tables:[{title:'テスト履歴',columns:['番号','結果'],rows:Array.from({length:5},(_,i)=>[String(i),'合格'])}],footer:'KUMUNO / 試用データ'};
await writeFile('report.json',JSON.stringify({html:renderPrintDocument(data),longHtml:renderPrintDocument({...data,tables:[{title:'複数ページのテスト',columns:['番号','結果'],rows:Array.from({length:150},(_,i)=>[String(i),'改ページを確認するテスト'])}]}),script:PRINT_SCRIPT,headers:PRINT_HEADERS}));
`);
 run(process.execPath,["verify.mjs"]);
 await writeFile(join(fixture,"verify.mts"),`import {renderPrintDocument,type PrintDocument} from '@kumuno/print';
const document:PrintDocument={title:'帳票',fields:[{label:'管理番号',value:null}]};
const html:string=renderPrintDocument(document);void html;
// @ts-expect-error raw models cannot be report field values
renderPrintDocument({title:'帳票',fields:[{label:'user',value:{password:'secret'}}]});
// @ts-expect-error raw HTML is not an option
renderPrintDocument({title:'帳票',html:'<script>x</script>'});
`);
 run(process.execPath,[join(root,"templates/default/node_modules/typescript/bin/tsc"),"--noEmit","--strict","--skipLibCheck","--module","nodenext","--moduleResolution","nodenext","--target","es2022","verify.mts"]);
 const report=JSON.parse(await readFile(join(fixture,"report.json"),"utf8"));
 const server=createServer((request,response)=>{
  if(request.url==="/print-client.js"){response.writeHead(200,{"Content-Type":"text/javascript"});response.end(report.script);}
  else {response.writeHead(200,report.headers);response.end(request.url==="/long"?report.longHtml:report.html);}
 });
 const {chromium}=createRequire(join(root,"templates/default/package.json"))("@playwright/test");
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 let browser;
 try {
  browser=await chromium.launch();
  const page=await browser.newPage();
  await page.addInitScript(()=>{window.print=()=>{window.printInvoked=true;};});
  for(const width of [1280,768,390]){
   await page.setViewportSize({width,height:900});await page.emulateMedia({media:"screen"});
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   if(await page.evaluate(()=>!!window.compromised))throw new Error("Untrusted report HTML executed.");
   if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw new Error("Report overflows viewport.");
   await page.getByRole("button",{name:"印刷 / PDF保存"}).click();
   await page.waitForFunction(()=>window.printInvoked===true);
   await page.emulateMedia({media:"print"});
   if(await page.locator(".toolbar").isVisible())throw new Error("Toolbar is visible in print output.");
   const pdf=await page.pdf({preferCSSPageSize:true});
   const match=pdf.toString("latin1").match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/);
   if(!match || Math.abs(Number(match[1])-595)>2 || Math.abs(Number(match[2])-842)>2)throw new Error("PDF paper is not A4.");
  }
  await page.goto(`http://127.0.0.1:${server.address().port}/long`);
  const longPdf=await page.pdf({preferCSSPageSize:true});
  if((longPdf.toString("latin1").match(/\/Type \/Page\b/g)??[]).length<2)throw new Error("Long table did not paginate.");
  console.log("Print browser contract verified: PC/tablet/mobile, escaped content, button, print media, A4 PDF buffers and multipage tables.");
 } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
 console.log('Independent @kumuno/print tgz installation, runtime imports and TypeScript public contract verified.');
} catch(error) {
 console.error('Independent print install failed. Fixture retained:',fixture);
 console.error(error.message);
 if(error.stdout)console.error(error.stdout.toString().slice(-2000));
 process.exitCode=1;
} finally {if(!process.exitCode)await rm(fixture,{recursive:true,force:true});}
