import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { listQuery } from "./validation";
export async function equipmentList(db: PrismaClient, organizationId: string, query: ReturnType<typeof listQuery>) {
  const where: Prisma.EquipmentWhereInput = { organizationId, ...(query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { category: { contains: query.q, mode: "insensitive" } }] } : {}) };
  const orderBy: Prisma.EquipmentOrderByWithRelationInput[] = query.sort === "newest" ? [{ createdAt: "desc" }, { id: "asc" }] : query.sort === "price" ? [{ purchasePrice: { sort: "desc", nulls: "last" } }, { id: "asc" }] : [{ name: "asc" }, { id: "asc" }];
  return db.$transaction(async tx => {
    const total = await tx.equipment.count({ where });
    const pages = Math.max(1, Math.ceil(total/query.size)), page = Math.min(query.page, pages);
    const rows = await tx.equipment.findMany({ where, orderBy, skip: (page-1)*query.size, take: query.size, include: { department: { select: { name: true } }, assignedUser: { select: { name: true } } } });
    return { rows, total, page, pages };
  }, { isolationLevel: "RepeatableRead" });
}
export function equipmentDetail(db: PrismaClient, organizationId: string, id: string) {
  return db.equipment.findFirst({ where: { id, organizationId }, include: { department: { select: { name: true } }, assignedUser: { select: { name: true } } } });
}
