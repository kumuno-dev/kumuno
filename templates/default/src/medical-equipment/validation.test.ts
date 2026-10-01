import { parseLoan, loanQuery } from "./loans";
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

test("貸出先のID・場所の長さを検査し、一覧入力を制限する", () => {
  const f = new FormData();f.set("deviceId","bad");f.set("departmentId","bad");f.set("destinationLocation","");
  expect(() => parseLoan(f)).toThrow();
  f.set("deviceId","11111111-1111-4111-8111-111111111111");f.set("departmentId","22222222-2222-4222-8222-222222222222");
  f.set("destinationLocation","x".repeat(121)); expect(() => parseLoan(f)).toThrow();
  f.set("destinationLocation"," 場所 "); expect(parseLoan(f).destinationLocation).toBe("場所");
  expect(loanQuery({q:["a"],state:"unknown",page:"-1"})).toMatchObject({q:"",returned:false,page:1});
});
