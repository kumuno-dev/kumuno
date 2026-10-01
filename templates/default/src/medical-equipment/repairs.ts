import type { PrismaClient, Prisma } from "../generated/prisma/client";
import type { MedicalRepairStatus } from "../generated/prisma/enums";
import { field, identifier, InputError } from "../management/validation";
import { requireTransactionActor } from "../authorization/transaction-actor";
import { appendAuditLog } from "../audit/log";
import { lockMedicalDevice } from "./loans";
export const repairStatuses = {REQUESTED:"修理依頼",IN_PROGRESS:"対応中",COMPLETED:"修理完了"};
export function parseRepair(form:FormData) {
  const operation = field(form,"operation",10);
  if (!["request","start","complete"].includes(operation)) throw new InputError("修理操作を確認してください。");
  if (form.get("confirm") !== "yes") throw new InputError("修理内容の確認にチェックしてください。");
  return {operation,deviceId:identifier(field(form,"deviceId",36)),
    repairId:operation === "request" ? null : identifier(field(form,"repairId",36)),
    problem:operation === "request" ? field(form,"problem",2000) : null,
    completionContent:operation === "complete" ? field(form,"completionContent",2000) : null};
}
export async function saveMedicalRepair(db:PrismaClient,actorId:string,organizationId:string,form:FormData) {
  const data = parseRepair(form);
  return db.$transaction(async tx=>{
    const actor = await requireTransactionActor(tx,actorId,"medical-equipment:manage",organizationId);
    await lockMedicalDevice(tx,organizationId,data.deviceId);
    const device = await tx.medicalDevice.findFirst({where:{id:data.deviceId,organizationId}});
    if (!device) throw new InputError("医療機器が見つかりません。");
    if (data.operation === "request") {
      if (device.status === "RETIRED") throw new InputError("廃棄済みの機器には修理を依頼できません。");
      if (await tx.medicalLoan.findFirst({where:{deviceId:device.id,organizationId,returnedAt:null}})) throw new InputError("先に機器の返却を記録してください。");
      if (await tx.medicalRepair.findFirst({where:{deviceId:device.id,organizationId,status:{not:"COMPLETED"}}})) throw new InputError("この機器は修理依頼済みです。");
      const after = await tx.medicalRepair.create({data:{organizationId,deviceId:device.id,reportedById:actor.id,problem:data.problem!}});
      const deviceAfter = await tx.medicalDevice.update({where:{id:device.id},data:{status:"SUSPENDED",returnInspectionPending:true}});
      await appendAuditLog(tx,actor,{action:"CREATE",resourceType:"MedicalRepair",resourceId:after.id,after});
      await appendAuditLog(tx,actor,{action:"UPDATE",resourceType:"MedicalDevice",resourceId:device.id,before:device,after:deviceAfter});
    } else {
      const before = await tx.medicalRepair.findFirst({where:{id:data.repairId!,deviceId:device.id,organizationId}});
      if (!before || before.status !== (data.operation === "start" ? "REQUESTED" : "IN_PROGRESS")) throw new InputError("修理の状態が変わりました。画面を再読み込みしてください。");
      const [{instant}] = await tx.$queryRaw<{instant:string}[]>`SELECT CURRENT_TIMESTAMP::text AS instant`;
      const now = new Date(instant);
      const after = await tx.medicalRepair.update({where:{id:before.id},data:data.operation === "start" ? {status:"IN_PROGRESS",startedAt:now} : {status:"COMPLETED",completedAt:now,completionContent:data.completionContent}});
      await appendAuditLog(tx,actor,{action:"UPDATE",resourceType:"MedicalRepair",resourceId:after.id,before,after});
    }
    return device.id;
  },{isolationLevel:"Serializable"});
}
export function repairQuery(input:Record<string,string|string[]|undefined>) {
  const q = typeof input.q === "string" ? input.q.trim().slice(0,120) : "";
  const status = typeof input.status === "string" && Object.hasOwn(repairStatuses,input.status) ? input.status as MedicalRepairStatus : undefined;
  return {q,status,page:typeof input.page === "string" && /^\d{1,6}$/.test(input.page) ? Math.max(1,Number(input.page)) : 1,size:10};
}
export async function medicalRepairList(db:PrismaClient,organizationId:string,query:ReturnType<typeof repairQuery>) {
  const where:Prisma.MedicalRepairWhereInput = {organizationId,status:query.status,...(query.q ? {OR:[{device:{name:{contains:query.q,mode:"insensitive"}}},{device:{managementNumber:{contains:query.q,mode:"insensitive"}}}]} : {})};
  return db.$transaction(async tx=>{
    const total = await tx.medicalRepair.count({where}), pages = Math.max(1,Math.ceil(total/query.size)),page = Math.min(query.page,pages);
    const rows = await tx.medicalRepair.findMany({where,orderBy:[{reportedAt:"desc"},{id:"asc"}],skip:(page-1)*query.size,take:query.size,include:{device:{select:{name:true,managementNumber:true}},reportedBy:{select:{name:true}}}});
    return {rows,total,page,pages};
  },{isolationLevel:"RepeatableRead"});
}
