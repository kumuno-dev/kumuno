export type Role = "ADMIN" | "MANAGER" | "USER";
export type Permission = "dashboard:read" | "users:read" | "users:manage" |
  "departments:read" | "departments:manage" | "roles:assign";
export type Principal = {
  id: string; organizationId: string; departmentId: string | null;
  role: Role; isActive: boolean;
};
export type ResourceScope = { organizationId: string };
export type RbacPolicy<P extends string = Permission> = {
  can(user: Principal | null, permission: P, scope: ResourceScope): boolean;
  assertPermission(user: Principal | null, permission: P, scope: ResourceScope): asserts user is Principal;
};
export class ForbiddenError extends Error { readonly status: 403; constructor(); }
export function createRbacPolicy<Extra extends string = never>(
  extensions?: Partial<Record<Role, readonly Extra[]>>
): RbacPolicy<Permission | Extra>;
export const can: RbacPolicy["can"];
export const assertPermission: RbacPolicy["assertPermission"];
