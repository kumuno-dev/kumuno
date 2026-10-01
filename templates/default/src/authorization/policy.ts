import { createRbacPolicy, type Permission as CorePermission, type RbacPolicy } from "@kumuno/rbac";
export { ForbiddenError } from "@kumuno/rbac";
export type { Principal, ResourceScope } from "@kumuno/rbac";
export type Permission = CorePermission | "equipment:read" | "equipment:manage" |
  "medical-equipment:read" | "medical-equipment:manage";
// Business permissions belong to this application, not the shared RBAC package.
const policy: RbacPolicy<Permission> = createRbacPolicy({
  ADMIN: ["equipment:read", "equipment:manage", "medical-equipment:read", "medical-equipment:manage"],
  MANAGER: ["equipment:read", "equipment:manage", "medical-equipment:read", "medical-equipment:manage"],
  USER: ["equipment:read", "medical-equipment:read"],
});
export const can = policy.can;
export const assertPermission: RbacPolicy<Permission>["assertPermission"] = policy.assertPermission;
