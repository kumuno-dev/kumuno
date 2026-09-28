import { appendAuditLog } from "../audit/log";
import { requireTransactionActor } from "../authorization/transaction-actor";
import type { PrismaClient } from "../generated/prisma/client";
import type { Authentication } from "./factory";

// Return only business identity, never cookies, session tokens or credentials.
export async function getActiveUser(auth: Authentication, db: PrismaClient, headers: Headers) {
  const result = await auth.api.getSession({ headers, query: { disableCookieCache: true, disableRefresh: true } });
  if (!result) return null;
  const user = await db.user.findUnique({ where: { id: result.user.id },
    select: { id: true, name: true, email: true, organizationId: true, departmentId: true, role: true, isActive: true } });
  if (!user?.isActive) {
    await db.session.deleteMany({ where: { userId: result.user.id } });
    return null;
  }
  return user;
}

// actorId must be taken from the authenticated server session by the caller.
export async function disableUser(db: PrismaClient, actorId: string, userId: string) {
  await db.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const actor = await requireTransactionActor(tx, actorId, "users:manage", before.organizationId);
    const after = await tx.user.update({ where: { id: userId }, data: { isActive: false } });
    await tx.session.deleteMany({ where: { userId } });
    if (before.isActive) {
      await appendAuditLog(tx, actor, { action: "UPDATE", resourceType: "User", resourceId: userId, before, after });
    }
  }, { isolationLevel: "Serializable" });
}
