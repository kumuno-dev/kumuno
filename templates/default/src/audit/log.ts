import { Prisma } from "../generated/prisma/client";
import type { AuditAction } from "../generated/prisma/enums";

type UserSnapshot = { isActive: boolean; role: string; departmentId: string | null };
type DepartmentSnapshot = { code: string; name: string; parentId: string | null };
type EquipmentSnapshot = { name: string; category: string; purchaseDate: Date | null; purchasePrice: { toString(): string } | null; departmentId: string | null; assignedUserId: string | null; status: string };
type MedicalDeviceSnapshot = { managementNumber: string; assetNumber: string | null; name: string; category: string; manufacturer: string | null; modelName: string | null; serialNumber: string | null; departmentId: string | null; location: string | null; purchaseDate: Date | null; warrantyUntil: Date | null; status: string; returnInspectionPending: boolean };
type MedicalLoanSnapshot = { deviceId: string; departmentId: string; loanedAt: Date; loanedById: string; returnedAt: Date | null; returnedById: string | null };
type MedicalInspectionSnapshot = {returnLoanId:string|null; deviceId:string; inspectedById:string; inspectionDate:Date; kind:string; result:string; nextInspectionDate:Date|null; recordedAt:Date; clearedPending:boolean};
type Event = { action: AuditAction; resourceId: string } & (
  { resourceType: "User"; before?: UserSnapshot; after?: UserSnapshot } |
  { resourceType: "Department"; before?: DepartmentSnapshot; after?: DepartmentSnapshot } |
  { resourceType: "Equipment"; before?: EquipmentSnapshot; after?: EquipmentSnapshot } |
  { resourceType: "MedicalDevice"; before?: MedicalDeviceSnapshot; after?: MedicalDeviceSnapshot } |
  { resourceType: "MedicalLoan"; before?: MedicalLoanSnapshot; after?: MedicalLoanSnapshot } |
  { resourceType: "MedicalInspection"; before?: MedicalInspectionSnapshot; after?: MedicalInspectionSnapshot }
);

// Explicit projections prevent whole records, credentials and request bodies being logged.
export function auditSnapshots(event: Event) {
  if ((event.action === "CREATE" && (event.before || !event.after)) ||
      (event.action === "UPDATE" && (!event.before || !event.after)) ||
      (event.action === "DELETE" && (!event.before || event.after))) {
    throw new Error("監査ログの変更前後が操作と一致しません。");
  }
  if (!["CREATE", "UPDATE", "DELETE"].includes(event.action)) throw new Error("監査操作が不正です。");
  if (event.resourceType === "User") {
    const pick = (value: UserSnapshot) => ({ isActive: value.isActive, role: value.role, departmentId: value.departmentId });
    return { before: event.before ? pick(event.before) : undefined, after: event.after ? pick(event.after) : undefined };
  }
  if (event.resourceType === "Department") {
    const pick = (value: DepartmentSnapshot) => ({ code: value.code, name: value.name, parentId: value.parentId });
    return { before: event.before ? pick(event.before) : undefined, after: event.after ? pick(event.after) : undefined };
  }
  if (event.resourceType === "Equipment") {
    const pick = (v: EquipmentSnapshot) => ({ name: v.name, category: v.category, purchaseDate: v.purchaseDate?.toISOString().slice(0,10) ?? null, purchasePrice: v.purchasePrice?.toString() ?? null, departmentId: v.departmentId, assignedUserId: v.assignedUserId, status: v.status });
    return { before: event.before ? pick(event.before) : undefined, after: event.after ? pick(event.after) : undefined };
  }
  if (event.resourceType === "MedicalDevice") {
    const pick = (v: MedicalDeviceSnapshot) => ({ managementNumber: v.managementNumber, assetNumber: v.assetNumber, name: v.name, category: v.category, manufacturer: v.manufacturer, modelName: v.modelName, serialNumber: v.serialNumber, departmentId: v.departmentId, location: v.location, purchaseDate: v.purchaseDate?.toISOString().slice(0,10) ?? null, warrantyUntil: v.warrantyUntil?.toISOString().slice(0,10) ?? null, status: v.status, returnInspectionPending: v.returnInspectionPending });
    return { before: event.before ? pick(event.before) : undefined, after: event.after ? pick(event.after) : undefined };
  }
  if (event.resourceType === "MedicalLoan") {
    const pick = (v: MedicalLoanSnapshot) => ({ deviceId:v.deviceId, departmentId:v.departmentId, loanedAt:v.loanedAt.toISOString(), loanedById:v.loanedById, returnedAt:v.returnedAt?.toISOString() ?? null, returnedById:v.returnedById });
    return { before:event.before ? pick(event.before) : undefined, after:event.after ? pick(event.after) : undefined };
  }
  if (event.resourceType === "MedicalInspection") {
    const pick = (v:MedicalInspectionSnapshot) => ({returnLoanId:v.returnLoanId,deviceId:v.deviceId,inspectedById:v.inspectedById,inspectionDate:v.inspectionDate.toISOString().slice(0,10),kind:v.kind,result:v.result,nextInspectionDate:v.nextInspectionDate?.toISOString().slice(0,10) ?? null,recordedAt:v.recordedAt.toISOString(),clearedPending:v.clearedPending});
    return {before:event.before ? pick(event.before) : undefined,after:event.after ? pick(event.after) : undefined};
  }
  throw new Error("監査対象が不正です。");
}

// Internal only: caller authenticates the actor, authorizes the operation and passes its transaction.
// userId is a historical ID, without cascading deletion when a user is removed.
export async function appendAuditLog(tx: Prisma.TransactionClient,
  actor: { id: string; organizationId: string }, event: Event) {
  const snapshots = auditSnapshots(event);
  return tx.auditLog.create({ data: {
    organizationId: actor.organizationId, userId: actor.id,
    action: event.action, resourceType: event.resourceType, resourceId: event.resourceId,
    metadata: { version: 1 },
    before: snapshots.before ?? Prisma.DbNull, after: snapshots.after ?? Prisma.DbNull,
  } });
}
