import type { PrismaClient } from "../generated/prisma/client";
import { appendAuditLog } from "../audit/log";
import { requireTransactionActor } from "../authorization/transaction-actor";
import { InputError } from "../management/validation";
import { parseMedicalDevice } from "./validation";
export async function saveMedicalDevice(db: PrismaClient, actorId: string, organizationId: string, form: FormData) {
  const { id, ...data } = parseMedicalDevice(form);
  return db.$transaction(async tx => {
    const actor = await requireTransactionActor(tx,actorId,"medical-equipment:manage",organizationId);
    const before = id ? await tx.medicalDevice.findFirst({ where: { id, organizationId } }) : null;
    if (id && !before) throw new InputError("医療機器が見つかりません。");
    if (data.departmentId && !await tx.department.findFirst({ where: { id: data.departmentId, organizationId } })) throw new InputError("所属部署を確認してください。");
    const after = before ? await tx.medicalDevice.update({ where: { id }, data }) : await tx.medicalDevice.create({ data: { ...data, organizationId } });
    await appendAuditLog(tx,actor,{ action: before ? "UPDATE" : "CREATE", resourceType: "MedicalDevice", resourceId: after.id, before: before ?? undefined, after });
    return after.id;
  }, { isolationLevel: "Serializable" });
}
