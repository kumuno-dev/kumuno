import type { Role } from "../generated/prisma/enums";

export type Permission = "dashboard:read" | "users:read" | "users:manage" |
  "departments:read" | "departments:manage" | "roles:assign" | "equipment:read" | "equipment:manage" | "medical-equipment:read" | "medical-equipment:manage";
export type Principal = {
  id: string; organizationId: string; departmentId: string | null;
  role: Role; isActive: boolean;
};
// An explicit scope allows future OWN / DEPARTMENT / SUBTREE policies.
export type ResourceScope = { organizationId: string };
const grants: Record<Role, readonly Permission[]> = {
  ADMIN: ["dashboard:read", "users:read", "users:manage", "departments:read", "departments:manage", "roles:assign", "equipment:read", "equipment:manage", "medical-equipment:read", "medical-equipment:manage"],
  MANAGER: ["dashboard:read", "users:read", "departments:read", "equipment:read", "equipment:manage", "medical-equipment:read", "medical-equipment:manage"],
  USER: ["dashboard:read", "equipment:read", "medical-equipment:read"],
};
export function can(user: Principal | null, permission: Permission, scope: ResourceScope): boolean {
  if (!user?.isActive || !user.organizationId || user.organizationId !== scope.organizationId) return false;
  return Object.hasOwn(grants, user.role) && grants[user.role].includes(permission);
}
export class ForbiddenError extends Error {
  readonly status = 403;
  constructor() { super("この操作を行う権限がありません。"); this.name = "ForbiddenError"; }
}
export function assertPermission(user: Principal | null, permission: Permission, scope: ResourceScope): asserts user is Principal {
  if (!can(user, permission, scope)) throw new ForbiddenError();
}
