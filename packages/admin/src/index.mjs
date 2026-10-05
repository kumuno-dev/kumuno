import { createElement as h } from "react";
const option=(value,label)=>h("option",{key:value,value},label);
const input=(label,props)=>h("label",null,label,h("input",props));
const select=(label,name,defaultValue,options)=>h("label",null,label,h("select",{name,defaultValue},options));
// Rendering only: caller scopes records, authorizes actions and validates every field.
export function UserFields({user,departments,passwordHelpId="kumuno-password-help"}) {
 return h("div",{className:"form-grid"},
  h("input",{type:"hidden",name:"id",value:user?.id??""}),
  input("氏名",{name:"name",required:true,maxLength:120,defaultValue:user?.name}),
  input("メールアドレス",{name:"email",type:"email",required:true,maxLength:254,defaultValue:user?.email}),
  input("社員番号",{name:"employeeCode",maxLength:40,defaultValue:user?.employeeCode??""}),
  select("所属部署","departmentId",user?.departmentId??"",[option("","未所属"),...departments.map(d=>option(d.id,d.name))]),
  select("ロール","role",user?.role??"USER",[option("USER","User"),option("MANAGER","Manager"),option("ADMIN","Admin")]),
  select("利用状態","isActive",String(user?.isActive??true),[option("true","有効"),option("false","無効")]),
  !user&&h("div",null,input("初期パスワード",{name:"password",type:"password",autoComplete:"new-password","aria-describedby":passwordHelpId,minLength:12,maxLength:128,required:true}),h("small",{id:passwordHelpId},"12〜128文字。安全な経路で本人へ伝えてください。"))
 );
}
export function DepartmentFields({department,departments}) {
 return h("div",{className:"form-grid"},
  h("input",{type:"hidden",name:"id",value:department?.id??""}),
  input("部署コード",{name:"code",required:true,maxLength:40,defaultValue:department?.code}),
  input("部署名",{name:"name",required:true,maxLength:120,defaultValue:department?.name}),
  select("親部署","parentId",department?.parentId??"",[option("","なし（最上位）"),...departments.filter(d=>d.id!==department?.id).map(d=>option(d.id,d.name))])
 );
}
