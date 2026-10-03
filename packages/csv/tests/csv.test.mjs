import test from "node:test";
import assert from "node:assert/strict";
import {parseCsv, stringifyCsv, CsvError} from "../src/index.mjs";
test("round trips Japanese text, quotes, commas, newlines, null and leading zeros", () => {
  const rows = [["001", 'ポンプ,"A"', "点検\n合格", null]];
  const csv = stringifyCsv({ headers: ["番号", "名称", "記録", "空"], rows });
  assert(csv.startsWith("\uFEFF")); assert(csv.endsWith("\r\n"));
  assert.deepEqual(parseCsv(csv), [["番号", "名称", "記録", "空"], ["001", 'ポンプ,"A"', "点検\n合格", ""]]);
  assert.equal(stringifyCsv({headers:["列"],rows:[]},{bom:false}), '"列"\r\n');
});
test("parses blank and quoted empty records, trailing cells and LF", () => {
  assert.deepEqual(parseCsv(""), []); assert.deepEqual(parseCsv("\uFEFF"), []);
  assert.deepEqual(parseCsv('\n""\n'), [[""], [""]]);
  assert.deepEqual(parseCsv('a,b\n1,\n'), [["a","b"],["1",""]]);
});
test("refuses malformed input and reports record coordinates without values", () => {
  for (const input of ['a,b\n1', 'a"b', '"a"x', '"a', 'a\rb', 'a\0b']) assert.throws(()=>parseCsv(input), CsvError);
  assert.throws(()=>parseCsv('a,b\n"secret"x,2'), error=>error.code==='AFTER_QUOTE' && error.row===2 && error.column===1 && !error.message.includes('secret'));
});
test("enforces UTF-8 bytes, row, column and cell limits", () => {
  assert.throws(()=>parseCsv('日本語',{maxBytes:8}), error=>error.code==='MAX_BYTES');
  assert.throws(()=>parseCsv('a\nb',{maxRows:1}), error=>error.code==='MAX_ROWS');
  assert.throws(()=>parseCsv('a,b',{maxColumns:1}), error=>error.code==='MAX_COLUMNS');
  assert.throws(()=>parseCsv('abc',{maxCellLength:2}), error=>error.code==='MAX_CELL_LENGTH');
  assert.throws(()=>parseCsv('a',{maxRows:0}), TypeError);
  assert.throws(()=>stringifyCsv({headers:['a'],rows:[['日本語']]},{maxBytes:10}), CsvError);
  assert.throws(()=>stringifyCsv({headers:['a'],rows:[['1','2']]}), CsvError);
  assert.throws(()=>stringifyCsv({headers:['a'],rows:[Array(1)]}), TypeError);
});
test("refuses spreadsheet formula prefixes without silently changing data", () => {
  for(const value of ['=1+1','+SUM(A1)','-1','@x','\tname','\rname','\nname','  =cmd','\uFEFF＠cmd','＝cmd','＋1','－1']) {
    assert.throws(()=>stringifyCsv({headers:['列'],rows:[[value]]}), error=>error.code==='FORMULA_PREFIX' && error.row===2 && error.column===1);
  }
  assert.deepEqual(parseCsv('"=1+1"'), [['=1+1']]);
  assert.deepEqual(parseCsv(stringifyCsv({headers:['列'],rows:[["x=1"],["O'Brien"]]})), [['列'],['x=1'],["O'Brien"]]);
});
