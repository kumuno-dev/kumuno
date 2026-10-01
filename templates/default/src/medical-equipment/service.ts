import type { PrismaClient } from "../generated/prisma/client";
import { appendAuditLog } from "../audit/log";
import { requireTransactionActor } from "../authorization/transaction-actor";
import { InputError } from "../management/validation";
import { lockMedicalDevice } from "./loans";
import { parseMedicalDevice } from "./validation";
export async function saveMedicalDevice(db: PrismaClient, actorId: string, organizationId: string, form: FormData) {
  const { id, ...data } = parseMedicalDevice(form);
  return db.$transaction(async tx => {
    const actor = await requireTransactionActor(tx,actorId,"medical-equipment:manage",organizationId);
    if (id) await lockMedicalDevice(tx,organizationId,id);
    const before = id ? await tx.medicalDevice.findFirst({ where: { id, organizationId } }) : null;
    if (id && !before) throw new InputError("医療機器が見つかりません。");
    if (data.departmentId && !await tx.department.findFirst({ where: { id: data.departmentId, organizationId } })) throw new InputError("所属部署を確認してください。");
    if (before && data.status !== "IN_SERVICE" && await tx.medicalLoan.findFirst({where:{deviceId:id,organizationId,returnedAt:null}})) throw new InputError("貸出中の機器は運用停止・廃棄へ変更できません。先に返却を記録してください。");
    if (before && data.status !== "SUSPENDED" && await tx.medicalRepair.findFirst({where:{deviceId:before.id,organizationId,status:{not:"COMPLETED"}}})) throw new InputError("修理中は運用停止を解除・廃棄できません。先に修理完了を記録してください。");
    const after = before ? await tx.medicalDevice.update({ where: { id }, data }) : await tx.medicalDevice.create({ data: { ...data, organizationId } });
    await appendAuditLog(tx,actor,{ action: before ? "UPDATE" : "CREATE", resourceType: "MedicalDevice", resourceId: after.id, before: before ?? undefined, after });
    return after.id;
  }, { isolationLevel: "Serializable" });
}
