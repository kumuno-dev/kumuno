import type { PrismaClient } from "../generated/prisma/client";

// All reparenting must use this boundary, including future management screens.
// Serializable isolation rejects concurrent edits that would create a cycle.
export async function moveDepartment(db: PrismaClient, organizationId: string, departmentId: string, parentId: string | null) {
  return db.$transaction(async (tx) => {
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
    return tx.department.update({ where: { id: departmentId }, data: { parentId } });
  }, { isolationLevel: "Serializable" });
}
