import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { MedicalInspectionKind, MedicalInspectionResult } from "../generated/prisma/enums";
import { InputError, field, identifier } from "../management/validation";
import { appendAuditLog } from "../audit/log";
import { requireTransactionActor } from "../authorization/transaction-actor";
import { lockMedicalDevice,withReturnTimes } from "./loans";
export const inspectionResults = { PASSED:"合格", FAILED:"不合格", INCOMPLETE:"未完了" };
export const inspectionKinds = { POST_RETURN:"返却後点検", PERIODIC:"定期点検", OTHER:"その他" };
export function todayInJapan() {
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function date(value:string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value || value < "0001-01-01") throw new InputError("点検日・次回点検予定日を確認してください。");
  return new Date(value);
}
export function parseInspection(form:FormData) {
  const result = field(form,"result"), kind = field(form,"kind"), version = field(form,"version",24);
  if (!Object.hasOwn(inspectionResults,result) || !Object.hasOwn(inspectionKinds,kind)) throw new InputError("点検の種類と結果を確認してください。");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(version) || !Number.isFinite(Date.parse(version))) throw new InputError("画面を再読み込みしてください。");
  const inspection = field(form,"inspectionDate",10), next = field(form,"nextInspectionDate",10,false);
  const inspectionDate = date(inspection), nextInspectionDate = next ? date(next) : null;
  if (inspection > todayInJapan() || (next && next < inspection)) throw new InputError("点検日は今日以前、次回予定は点検日以降にしてください。");
  if (form.get("confirm") !== "yes") throw new InputError("点検内容と結果の確認にチェックしてください。");
  return {deviceId:identifier(field(form,"deviceId",36)),version,inspectionDate,nextInspectionDate,
    kind:kind as MedicalInspectionKind,result:result as MedicalInspectionResult,content:field(form,"content",2000)};
}
export async function recordMedicalInspection(db:PrismaClient,actorId:string,organizationId:string,form:FormData) {
  const {version,...data} = parseInspection(form);
  return db.$transaction(async tx => {
    const actor = await requireTransactionActor(tx,actorId,"medical-equipment:manage",organizationId);
    const before = await tx.medicalDevice.findFirst({where:{id:data.deviceId,organizationId}});
    if (!before) throw new InputError("医療機器が見つかりません。");
    if (before.updatedAt.toISOString() !== version) throw new InputError("機器の状態が変わりました。画面を再読み込みして点検を確認してください。");
    await lockMedicalDevice(tx,organizationId,before.id);
    if (before.status === "RETIRED") throw new InputError("廃棄済みの機器には点検を登録できません。");
    if (await tx.medicalLoan.findFirst({where:{deviceId:before.id,organizationId,returnedAt:null}})) throw new InputError("貸出中の機器には点検を登録できません。先に返却を記録してください。");
    if (await tx.medicalRepair.findFirst({where:{deviceId:before.id,organizationId,status:{not:"COMPLETED"}}})) throw new InputError("修理中の機器には点検を登録できません。先に修理完了を記録してください。");
    const storedReturn = await tx.medicalLoan.findFirst({where:{deviceId:before.id,organizationId,returnedAt:{not:null}},orderBy:[{loanedAt:"desc"},{id:"desc"}]});
    const lastReturn = storedReturn ? (await withReturnTimes(tx,organizationId,[storedReturn]))[0] : null;
    if (data.kind === "POST_RETURN" && !lastReturn) throw new InputError("返却履歴がありません。点検の種類を確認してください。");
    if (lastReturn?.returnedAt && (data.kind === "POST_RETURN" || before.returnInspectionPending) && data.result === "PASSED") {
      const returnedDay = new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(lastReturn.returnedAt);
      if (data.inspectionDate.toISOString().slice(0,10) < returnedDay) throw new InputError("合格点検の日付は直近の返却日以降にしてください。");
    }
    const lastRepair = await tx.medicalRepair.findFirst({where:{deviceId:before.id,organizationId,status:"COMPLETED"},orderBy:[{completedAt:"desc"},{id:"asc"}]});
    if (lastRepair?.completedAt && before.returnInspectionPending && data.result === "PASSED") {
      const repairedDay = new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(lastRepair.completedAt);
      if (data.inspectionDate.toISOString().slice(0,10) < repairedDay) throw new InputError("合格点検の日付は直近の修理完了日以降にしてください。");
    }
    const passed = data.result === "PASSED" && before.status === "IN_SERVICE";
    const after = await tx.medicalDevice.update({where:{id:before.id},data:{returnInspectionPending:!passed,updatedAt:new Date(Math.max(Date.now(),before.updatedAt.getTime()+1))}});
    const inspection = await tx.medicalInspection.create({data:{...data,organizationId,inspectedById:actor.id,returnLoanId:(data.kind === "POST_RETURN" || before.returnInspectionPending) ? lastReturn?.id ?? null : null,clearedPending:passed && before.returnInspectionPending}});
    await appendAuditLog(tx,actor,{action:"CREATE",resourceType:"MedicalInspection",resourceId:inspection.id,after:inspection});
    await appendAuditLog(tx,actor,{action:"UPDATE",resourceType:"MedicalDevice",resourceId:after.id,before,after});
    return before.id;
  },{isolationLevel:"Serializable"});
}
export function inspectionQuery(input:Record<string,string|string[]|undefined>) {
  const q = typeof input.q === "string" ? input.q.trim().slice(0,120) : "";
  const result = typeof input.result === "string" && Object.hasOwn(inspectionResults,input.result) ? input.result as MedicalInspectionResult : undefined;
  return {q,result,page:typeof input.page === "string" && /^\d{1,6}$/.test(input.page) ? Math.max(1,Number(input.page)) : 1,size:10};
}
export async function medicalInspectionList(db:PrismaClient,organizationId:string,query:ReturnType<typeof inspectionQuery>,includeSamples=true) {
  const where:Prisma.MedicalInspectionWhereInput = {organizationId,device:includeSamples ? undefined : {isSample:false},result:query.result,
    ...(query.q ? {OR:[{device:{name:{contains:query.q,mode:"insensitive"}}},{device:{managementNumber:{contains:query.q,mode:"insensitive"}}}]} : {})};
  return db.$transaction(async tx=>{
    const total = await tx.medicalInspection.count({where}), pages = Math.max(1,Math.ceil(total/query.size)),page = Math.min(query.page,pages);
    const rows = await tx.medicalInspection.findMany({where,orderBy:[{inspectionDate:"desc"},{recordedAt:"desc"},{id:"asc"}],skip:(page-1)*query.size,take:query.size,include:{device:{select:{name:true,managementNumber:true}},inspectedBy:{select:{name:true}}}});
    return {rows,total,page,pages};
  },{isolationLevel:"RepeatableRead"});
}
