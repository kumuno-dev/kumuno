import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { listQuery } from "./validation";
export async function medicalDeviceList(db: PrismaClient, organizationId: string, query: ReturnType<typeof listQuery>) {
  const where: Prisma.MedicalDeviceWhereInput = { organizationId, status: query.status,
    ...(query.q ? { OR: ["name","category","managementNumber","assetNumber","manufacturer","modelName","serialNumber","location"].map(key => ({ [key]: { contains: query.q, mode: "insensitive" } })) } : {}) };
  return db.$transaction(async tx => {
    const total = await tx.medicalDevice.count({ where });
    const pages = Math.max(1,Math.ceil(total/query.size)), page = Math.min(query.page,pages);
    const rows = await tx.medicalDevice.findMany({ where, orderBy: [{ managementNumber: "asc" },{ id: "asc" }], skip: (page-1)*query.size, take: query.size, include: { department: { select: { name: true } } } });
    return { rows, total, page, pages };
  }, { isolationLevel: "RepeatableRead" });
}
export function medicalDeviceDetail(db: PrismaClient, organizationId: string, id: string) {
  return db.medicalDevice.findFirst({ where: { id, organizationId }, include: { department: { select: { name: true } } } });
}
