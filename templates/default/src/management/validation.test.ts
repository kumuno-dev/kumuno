import { expect, test } from "vitest";
import { parseUser, parseDepartment } from "./validation";
function form(data: Record<string, string>) { const f = new FormData(); for (const [k,v] of Object.entries(data)) f.set(k,v); return f; }
const user = { id: "", name: "人", email: " PERSON@EXAMPLE.COM ", employeeCode: "", departmentId: "", role: "USER", isActive: "true", password: "long-password-123" };
test("ユーザーのメール正規化と未所属を扱う", () => {
  expect(parseUser(form(user))).toMatchObject({ email: "person@example.com", departmentId: null, role: "USER" });
});
test("ブラウザー検証を迂回した不正な登録を拒否する", () => {
  for (const change of [{ name: " " }, { email: "invalid" }, { role: "ROOT" }, { isActive: "maybe" }, { departmentId: "invalid" }, { password: "short" }, { employeeCode: "a".repeat(41) }]) expect(() => parseUser(form({ ...user, ...change }))).toThrow();
  expect(() => parseDepartment(form({ id: "", code: "", name: "部署", parentId: "" }))).toThrow();
});
