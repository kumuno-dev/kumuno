import type { PrismaClient } from "../generated/prisma/client";
import { appendAuditLog } from "../audit/log";
import { requireTransactionActor } from "../authorization/transaction-actor";
import { InputError, identifier } from "../management/validation";
import { parseEquipment } from "./validation";
export async function saveEquipment(db: PrismaClient, actorId: string, organizationId: string, form: FormData) {
  const { id, ...data } = parseEquipment(form);
  return db.$transaction(async tx => {
    const actor = await requireTransactionActor(tx, actorId, "equipment:manage", organizationId);
    const before = id ? await tx.equipment.findFirst({ where: { id, organizationId } }) : null;
    if (id && !before) throw new InputError("備品が見つかりません。");
    if (data.departmentId && !await tx.department.findFirst({ where: { id: data.departmentId, organizationId } })) throw new InputError("部署を確認してください。");
    if (data.assignedUserId && !await tx.user.findFirst({ where: { id: data.assignedUserId, organizationId, isActive: true } })) throw new InputError("有効な担当者を選択してください。");
    const after = before ? await tx.equipment.update({ where: { id }, data }) : await tx.equipment.create({ data: { ...data, organizationId } });
    await appendAuditLog(tx, actor, { action: before ? "UPDATE" : "CREATE", resourceType: "Equipment", resourceId: after.id, before: before ?? undefined, after });
    return after.id;
  }, { isolationLevel: "Serializable" });
}
export async function deleteEquipment(db: PrismaClient, actorId: string, organizationId: string, id: string) {
  identifier(id);
  return db.$transaction(async tx => {
    const actor = await requireTransactionActor(tx, actorId, "equipment:manage", organizationId);
    const before = await tx.equipment.findFirst({ where: { id, organizationId } });
    if (!before) throw new InputError("備品が見つかりません。");
    await tx.equipment.delete({ where: { id } });
    await appendAuditLog(tx, actor, { action: "DELETE", resourceType: "Equipment", resourceId: id, before });
  }, { isolationLevel: "Serializable" });
}
