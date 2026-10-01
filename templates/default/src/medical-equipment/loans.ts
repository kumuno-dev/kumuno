import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { appendAuditLog } from "../audit/log";
import { requireTransactionActor } from "../authorization/transaction-actor";
import { InputError, field, identifier } from "../management/validation";
export function parseLoan(form: FormData) {
  return { deviceId: identifier(field(form,"deviceId",36)), departmentId: identifier(field(form,"departmentId",36)),
    destinationLocation: field(form,"destinationLocation",120,false) || null };
}
export async function lockMedicalDevice(tx: Prisma.TransactionClient, organizationId: string, id: string) {
  // A scoped UPDATE locks the row and honours the Prisma adapter schema.
  // It also serializes loans with ledger edits; failures roll this touch back.
  await tx.medicalDevice.updateMany({where:{id,organizationId},data:{updatedAt:new Date()}});
}
export async function lendMedicalDevice(db: PrismaClient, actorId: string, organizationId: string, form: FormData) {
  const data = parseLoan(form);
  return db.$transaction(async tx => {
    const actor = await requireTransactionActor(tx,actorId,"medical-equipment:manage",organizationId);
    await lockMedicalDevice(tx,organizationId,data.deviceId);
    const device = await tx.medicalDevice.findFirst({where:{id:data.deviceId,organizationId}});
    if (!device) throw new InputError("医療機器が見つかりません。");
    if (await tx.medicalRepair.findFirst({where:{deviceId:device.id,organizationId,status:{not:"COMPLETED"}}})) throw new InputError("修理中の機器は貸出できません。");
    if (device.status !== "IN_SERVICE") throw new InputError("運用停止・廃棄済みの機器は貸出できません。");
    if (device.returnInspectionPending) throw new InputError("返却後の点検待ちです。再貸出できません。");
    if (await tx.medicalLoan.findFirst({where:{deviceId:device.id,organizationId,returnedAt:null}})) throw new InputError("この機器は貸出中です。");
    const department = await tx.department.findFirst({where:{id:data.departmentId,organizationId}});
    if (!department) throw new InputError("貸出先の部署を確認してください。");
    const after = await tx.medicalLoan.create({data:{...data,organizationId,destinationName:department.name,loanedById:actor.id}});
    await appendAuditLog(tx,actor,{action:"CREATE",resourceType:"MedicalLoan",resourceId:after.id,after});
    return device.id;
  },{isolationLevel:"Serializable"});
}
export async function returnMedicalDevice(db: PrismaClient, actorId: string, organizationId: string, loanId: string) {
  identifier(loanId);
  return db.$transaction(async tx => {
    const actor = await requireTransactionActor(tx,actorId,"medical-equipment:manage",organizationId);
    const before = await tx.medicalLoan.findFirst({where:{id:loanId,organizationId}});
    if (!before) throw new InputError("貸出記録が見つかりません。");
    await lockMedicalDevice(tx,organizationId,before.deviceId);
    if (before.returnedAt) throw new InputError("この貸出は返却済みです。");
    const [{instant}] = await tx.$queryRaw<{instant:string}[]>`SELECT CURRENT_TIMESTAMP::text AS instant`;
    const now = new Date(instant);
    const result = await tx.medicalLoan.updateMany({where:{id:loanId,organizationId,returnedAt:null},data:{returnedAt:now,returnedById:actor.id}});
    if (result.count !== 1) throw new InputError("この貸出は返却済みです。");
    const after = await tx.medicalLoan.findUniqueOrThrow({where:{id:loanId}});
    const deviceBefore = await tx.medicalDevice.findFirstOrThrow({where:{id:before.deviceId,organizationId}});
    const deviceAfter = await tx.medicalDevice.update({where:{id:before.deviceId},data:{returnInspectionPending:true}});
    await appendAuditLog(tx,actor,{action:"UPDATE",resourceType:"MedicalLoan",resourceId:loanId,before,after});
    await appendAuditLog(tx,actor,{action:"UPDATE",resourceType:"MedicalDevice",resourceId:deviceAfter.id,before:deviceBefore,after:deviceAfter});
    return before.deviceId;
  },{isolationLevel:"Serializable"});
}
export function loanQuery(input: Record<string,string|string[]|undefined>) {
  const q = typeof input.q === "string" ? input.q.trim().slice(0,120) : "";
  return { q, returned: input.state === "returned", page: typeof input.page === "string" && /^\d{1,6}$/.test(input.page) ? Math.max(1,Number(input.page)) : 1, size:10 };
}
export async function medicalLoanList(db: PrismaClient, organizationId: string, query: ReturnType<typeof loanQuery>) {
  const where: Prisma.MedicalLoanWhereInput = {organizationId,returnedAt:query.returned ? {not:null} : null,
    ...(query.q ? { OR:[{destinationName:{contains:query.q,mode:"insensitive"}},{device:{name:{contains:query.q,mode:"insensitive"}}},{device:{managementNumber:{contains:query.q,mode:"insensitive"}}}] } : {})};
  return db.$transaction(async tx => {
    const total = await tx.medicalLoan.count({where}), pages = Math.max(1,Math.ceil(total/query.size)),page = Math.min(query.page,pages);
    const rows = await tx.medicalLoan.findMany({where,orderBy:[{loanedAt:"desc"},{id:"asc"}],skip:(page-1)*query.size,take:query.size,include:{device:{select:{name:true,managementNumber:true}},loanedBy:{select:{name:true}},returnedBy:{select:{name:true}}}});
    return {rows:await withReturnTimes(tx,organizationId,rows),total,page,pages};
  },{isolationLevel:"RepeatableRead"});
}
export function displayDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(date);
}

// Read compatibility for the earlier raw timestamptz decoding bug.
// Existing business records and original audits are never changed here.
export async function withReturnTimes<T extends {id:string;loanedAt:Date;returnedAt:Date|null;returnedById:string|null}>(db:Prisma.TransactionClient,organizationId:string,rows:T[]):Promise<T[]> {
  const returned = rows.filter(l=>l.returnedAt);
  if (!returned.length) return rows;
  const audits = await db.auditLog.findMany({where:{organizationId,resourceType:"MedicalLoan",resourceId:{in:returned.map(l=>l.id)},action:"UPDATE"},orderBy:[{timestamp:"asc"},{id:"asc"}],select:{resourceId:true,timestamp:true,userId:true,before:true,after:true}});
  return rows.map(l=>{
    if (!l.returnedAt) return l;
    const audit = audits.find(a=>{
      if (!a.before || typeof a.before !== "object" || Array.isArray(a.before) || !a.after || typeof a.after !== "object" || Array.isArray(a.after)) return false;
      return a.before.returnedAt === null && a.after.returnedAt === l.returnedAt!.toISOString() && a.userId === l.returnedById && a.timestamp >= l.loanedAt;
    });
    return audit && Math.abs(l.returnedAt.getTime()-audit.timestamp.getTime()) > 1000 ? {...l,returnedAt:audit.timestamp} : l;
  });
}
