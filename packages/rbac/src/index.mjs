const coreGrants = {
  ADMIN: ["dashboard:read", "users:read", "users:manage", "departments:read", "departments:manage", "roles:assign"],
  MANAGER: ["dashboard:read", "users:read", "departments:read"],
  USER: ["dashboard:read"],
};
export class ForbiddenError extends Error {
  status = 403;
  constructor() { super("この操作を行う権限がありません。"); this.name = "ForbiddenError"; }
}
// Configuration is trusted application code; copy it so later mutations cannot change access.
export function createRbacPolicy(extensions = {}) {
  const grants = new Map(Object.entries(coreGrants).map(([role, permissions]) => {
    const extra = Object.hasOwn(extensions, role) ? extensions[role] : [];
    if (!Array.isArray(extra) || extra.some(value => typeof value !== "string" || !value.trim())) {
      throw new TypeError("Permission extensions must be arrays of non-empty strings.");
    }
    return [role, new Set([...permissions, ...extra])];
  }));
  function can(user, permission, scope) {
    if (user?.isActive !== true || typeof user.organizationId !== "string" ||
        !user.organizationId.trim() || !scope || user.organizationId !== scope.organizationId) return false;
    return grants.get(user.role)?.has(permission) ?? false;
  }
  function assertPermission(user, permission, scope) {
    if (!can(user, permission, scope)) throw new ForbiddenError();
  }
  return Object.freeze({ can, assertPermission });
}
export const { can, assertPermission } = createRbacPolicy();
