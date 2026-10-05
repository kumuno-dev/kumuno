import assert from "node:assert/strict";
import test from "node:test";
import {createElement as h} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {UserFields,DepartmentFields} from "../src/index.mjs";
test("新規ユーザーのパスワード補助と部署ラベルを提供し、HTMLを解釈しない",()=>{
 const html=renderToStaticMarkup(h(UserFields,{departments:[{id:"d",name:"<script>unsafe</script>"}],passwordHelpId:"help-unique"}));
 assert(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));assert(!html.includes('<script>'));
 assert(html.includes('type="password"'));assert(html.includes('aria-describedby="help-unique"'));assert(html.includes('id="help-unique"'));assert(/minlength="12"/i.test(html));
});
test("既存ユーザーでは資格情報を描画せず所属・ロール・有効状態を選択する",()=>{
 const html=renderToStaticMarkup(h(UserFields,{user:{id:"u",name:'<b>name</b>',email:"u@example.com",employeeCode:null,departmentId:"d",role:"MANAGER",isActive:false,password:"DO-NOT-RENDER"},departments:[{id:"d",name:"部署"}]}));
 assert(!html.includes('type="password"'));assert(!html.includes('DO-NOT-RENDER'));assert(html.includes('&lt;b&gt;name&lt;/b&gt;'));assert(html.includes('value="MANAGER" selected=""'));assert(html.includes('value="false" selected=""'));assert(html.includes('value="d" selected=""'));
});
test("親部署の現在値を表示し、自部署を選択肢から除外する",()=>{
 const html=renderToStaticMarkup(h(DepartmentFields,{department:{id:"self",code:"A",name:"部署",parentId:"parent"},departments:[{id:"self",name:"SELF-OPTION"},{id:"parent",name:"親"}]}));
 assert(!html.includes('SELF-OPTION'));assert(html.includes('value="parent" selected=""'));assert(html.includes('name="code"'));assert(html.includes('name="parentId"'));
});
