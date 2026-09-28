import type { Prisma } from "../generated/prisma/client";
import { assertPermission, type Permission } from "./policy";

// actorId must come from a verified server session, never a request-body userId.
export async function requireTransactionActor(tx: Prisma.TransactionClient, actorId: string,
  permission: Permission, organizationId: string) {
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: {
    id: true, organizationId: true, departmentId: true, role: true, isActive: true,
  } });
  assertPermission(actor, permission, { organizationId });
  return actor;
}
