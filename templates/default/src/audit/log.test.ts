import { expect, test } from "vitest";
import { auditSnapshots } from "./log";
const snapshot = { isActive: true, role: "USER", departmentId: null, password: "secret", token: "secret", email: "private@example.com" };
test("許可した業務属性だけを記録する", () => {
  const result = auditSnapshots({ action: "UPDATE", resourceType: "User", resourceId: "id", before: snapshot, after: { ...snapshot, isActive: false } });
  expect(result.before).toEqual({ isActive: true, role: "USER", departmentId: null });
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(JSON.stringify(result)).not.toContain("private@example.com");
});
test("CREATE/UPDATE/DELETEで変更前後の整合性を要求する", () => {
  expect(auditSnapshots({ action: "CREATE", resourceType: "User", resourceId: "id", after: snapshot }).before).toBeUndefined();
  expect(auditSnapshots({ action: "DELETE", resourceType: "User", resourceId: "id", before: snapshot }).after).toBeUndefined();
  expect(() => auditSnapshots({ action: "UPDATE", resourceType: "User", resourceId: "id", after: snapshot })).toThrow();
  expect(() => auditSnapshots({ action: "CREATE", resourceType: "User", resourceId: "id", before: snapshot, after: snapshot })).toThrow();
});
