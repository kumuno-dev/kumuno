import { appendAuditLog } from "../audit/log";
import { requireTransactionActor } from "../authorization/transaction-actor";
import type { PrismaClient } from "../generated/prisma/client";

// All reparenting must use this boundary, including future management screens.
// Serializable isolation rejects concurrent edits that would create a cycle.
export async function moveDepartment(db: PrismaClient, actorId: string, organizationId: string, departmentId: string, parentId: string | null) {
  return db.$transaction(async (tx) => {
    const actor = await requireTransactionActor(tx, actorId, "departments:manage", organizationId);
    const departments = await tx.department.findMany({ where: { organizationId }, select: { id: true, parentId: true } });
    const parents = new Map(departments.map(department => [department.id, department.parentId]));
    if (!parents.has(departmentId) || (parentId !== null && !parents.has(parentId))) {
      throw new Error("部署が指定の組織に存在しません。");
    }
    const visited = new Set([departmentId]);
    let current = parentId;
    while (current !== null) {
      if (visited.has(current)) throw new Error("部署の循環参照は作成できません。");
      visited.add(current);
      current = parents.get(current) ?? null;
    }
    const before = await tx.department.findUniqueOrThrow({ where: { id: departmentId } });
    if (before.parentId === parentId) return before;
    const after = await tx.department.update({ where: { id: departmentId }, data: { parentId } });
    await appendAuditLog(tx, actor, { action: "UPDATE", resourceType: "Department", resourceId: departmentId, before, after });
    return after;
  }, { isolationLevel: "Serializable" });
}
