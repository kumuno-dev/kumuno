import type { PrismaClient } from "../generated/prisma/client";
import type { Authentication } from "./factory";

// Return only business identity, never cookies, session tokens or credentials.
export async function getActiveUser(auth: Authentication, db: PrismaClient, headers: Headers) {
  const result = await auth.api.getSession({ headers, query: { disableCookieCache: true, disableRefresh: true } });
  if (!result) return null;
  const user = await db.user.findUnique({ where: { id: result.user.id },
    select: { id: true, name: true, email: true, organizationId: true, departmentId: true, isActive: true } });
  if (!user?.isActive) {
    await db.session.deleteMany({ where: { userId: result.user.id } });
    return null;
  }
  return user;
}

// Internal service only; future management entry points must enforce RBAC first.
export async function disableUser(db: PrismaClient, userId: string) {
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { isActive: false } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
}
