import test from "node:test";
import assert from "node:assert/strict";
import {renderPrintDocument, PRINT_HEADERS, PRINT_SCRIPT} from "../src/index.mjs";
test("escapes every report field and never accepts raw HTML",()=>{
 const text=`<script>alert("x")</script>&'`;
 const html=renderPrintDocument({title:text,subtitle:text,fields:[{label:text,value:text}],tables:[{title:text,columns:[text],rows:[[text]]}],footer:text});
 assert.equal(html.includes(text),false);assert.equal(html.includes('&lt;script&gt;'),true);assert.equal(html.includes('&amp;&#39;'),true);
 assert.equal(html.includes('onclick='),false);assert.equal(html.includes('lang="ja"'),true);
});
test("A4 page settings, printable tables and private headers are explicit",()=>{
 const html=renderPrintDocument({title:"台帳",fields:[{label:"メーカー",value:null}],tables:[{title:"履歴",columns:["日付"],rows:[["2026-10-03"]]}]});
 assert.match(html,/@page\{size:A4 portrait;margin:16mm\}/);assert.match(html,/table-header-group/);assert.match(html,/未設定/);assert.match(html,/data-kumuno-print/);
 assert.match(PRINT_HEADERS['Cache-Control'],/private, no-store/);assert.equal(PRINT_HEADERS.Vary,'Cookie');assert.match(PRINT_HEADERS['Content-Security-Policy'],/default-src 'none'/);assert.match(PRINT_SCRIPT,/window.print/);
});
test("rejects unsafe script locations and mismatched table columns",()=>{
 for(const scriptPath of ['https://other.test/print.js','//other.test/x','/../x','/x?token=secret','/x" onerror="x'])assert.throws(()=>renderPrintDocument({title:"帳票"},{scriptPath}),TypeError);
 assert.throws(()=>renderPrintDocument({title:"帳票",tables:[{title:"表",columns:["a","b"],rows:[["one"]]}]}),TypeError);
 assert.throws(()=>renderPrintDocument({title:""}),TypeError);
 assert.throws(()=>renderPrintDocument({title:"帳票",fields:[{label:"value",value:{secret:true}}]}),TypeError);
});
