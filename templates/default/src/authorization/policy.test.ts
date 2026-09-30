import { expect, test } from "vitest";
import { can, assertPermission, ForbiddenError, type Principal, type Permission } from "./policy";
const user: Principal = { id: "u", organizationId: "org", departmentId: null, role: "USER", isActive: true };
const scope = { organizationId: "org" };
test("ロールごとの許可表を共通化する", () => {
  const permissions: Permission[] = ["dashboard:read", "users:read", "users:manage", "departments:read", "departments:manage", "roles:assign"];
  for (const [role, expected] of [
    ["ADMIN", [true, true, true, true, true, true]],
    ["MANAGER", [true, true, false, true, false, false]],
    ["USER", [true, false, false, false, false, false]],
  ] as const) {
    expect(permissions.map(permission => can({ ...user, role }, permission, scope))).toEqual(expected);
    expect(can({ ...user, role }, "users:read", { organizationId: "other" })).toBe(false);
  }
});
test("未認証・無効・未知ロール・未知操作は拒否する", () => {
  expect(can(null, "dashboard:read", scope)).toBe(false);
  expect(can({ ...user, isActive: false }, "dashboard:read", scope)).toBe(false);
  expect(can({ ...user, role: "toString" as Principal["role"] }, "dashboard:read", scope)).toBe(false);
  expect(can(user, "unknown" as Permission, scope)).toBe(false);
  expect(() => assertPermission(user, "roles:assign", scope)).toThrow(ForbiddenError);
  expect(() => assertPermission(user, "dashboard:read", scope)).not.toThrow();
});

test("備品は全ロールが参照しAdminとManagerだけが更新できる", () => {
 for(const role of ["ADMIN","MANAGER","USER"] as const) {
  expect(can({...user,role},"equipment:read",scope)).toBe(true);
  expect(can({...user,role},"equipment:manage",scope)).toBe(role!=="USER");
  expect(can({...user,role},"equipment:manage",{organizationId:"other"})).toBe(false);
 }
});
