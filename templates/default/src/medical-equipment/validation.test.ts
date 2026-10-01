import { expect, test } from "vitest";
import { parseMedicalDevice, listQuery } from "./validation";
function form(change: Record<string,string> = {}) {
  const f = new FormData();
  for (const [k,v] of Object.entries({ id:"", managementNumber:"ME-001", assetNumber:"", name:"輸液ポンプ", category:"輸液ポンプ", manufacturer:"", modelName:"", serialNumber:"", departmentId:"", location:"", purchaseDate:"2026-10-01", warrantyUntil:"", status:"IN_SERVICE", notes:"", ...change })) f.set(k,v);
  return f;
}
test("台帳の必須項目、日付、ID、状態を検証する", () => {
  expect(parseMedicalDevice(form({managementNumber:" ME-001 "}))).toMatchObject({managementNumber:"ME-001",assetNumber:null});
  const invalid: Record<string,string>[] = [{managementNumber:" "},{managementNumber:"x".repeat(81)},{purchaseDate:"2026-02-30"},{warrantyUntil:"2026-13-01"},{status:"toString"},{status:"RENTED"},{departmentId:"invalid"},{id:"invalid"}];
  for (const c of invalid) expect(() => parseMedicalDevice(form(c))).toThrow();
});
test("台帳の検索と状態フィルターを安全な値へ絞る", () => {
  expect(listQuery({q:" ME-001 ",status:"SUSPENDED",page:"2"})).toMatchObject({q:"ME-001",status:"SUSPENDED",page:2});
  expect(listQuery({q:["a","b"],status:"toString",page:"-1"})).toMatchObject({q:"",status:undefined,page:1});
});
