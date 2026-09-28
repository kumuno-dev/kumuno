import "server-only";
import { requireUser } from "../authentication/require-user";
import { assertPermission, type Permission, type ResourceScope } from "./policy";

// Fetch the current role from the DB on every request; never trust client roles.
export async function requirePermission(permission: Permission, scope?: ResourceScope) {
  const user = await requireUser();
  assertPermission(user, permission, scope ?? { organizationId: user.organizationId });
  return user;
}
