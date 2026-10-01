import type { PrismaClient } from "../generated/prisma/client";
import { requireTransactionActor } from "../authorization/transaction-actor";
import { appendAuditLog } from "../audit/log";
import { InputError } from "../management/validation";
import { todayInJapan } from "./inspections";
export async function createMedicalSamples(db:PrismaClient,actorId:string,organizationId:string) {
  return db.$transaction(async tx=>{
    const actor = await requireTransactionActor(tx,actorId,"medical-equipment:manage",organizationId);
    // One transaction creates the complete fictional scenario. Reopening never resets it.
    if (await tx.medicalSampleDataset.findUnique({where:{organizationId}})) return false;
    await tx.medicalSampleDataset.create({data:{organizationId}});
    const department = await tx.department.findFirst({where:{organizationId},orderBy:{id:"asc"}});
    if (!department) throw new InputError("テストデータを用意するには、先に部署を1つ登録してください。");
    const [{instant}] = await tx.$queryRaw<{instant:string}[]>`SELECT CURRENT_TIMESTAMP::text AS instant`;
    const now = new Date(instant), earlier = new Date(now.getTime()-60*60*1000), inspectionDate = new Date(todayInJapan());
    const names = ["輸液ポンプ（貸出可能）","シリンジポンプ（貸出中）","輸液ポンプ（返却後点検待ち）","人工呼吸器（点検不合格）","生体情報モニター（修理中）","吸引器（修理完了・点検待ち）","輸液ポンプ（廃棄済み）"];
    for (let i=0;i<names.length;i++) {
      const device = await tx.medicalDevice.create({data:{organizationId,isSample:true,managementNumber:`KUMUNO-DEMO-${String(i+1).padStart(2,"0")}`,name:`【テスト】${names[i]}`,category:i===3 ? "人工呼吸器" : i===4 ? "モニター" : i===5 ? "吸引器" : "ポンプ",departmentId:department.id,location:"架空の機器管理室",manufacturer:"架空メーカー",status:i===4 || i===5 ? "SUSPENDED" : i===6 ? "RETIRED" : "IN_SERVICE",returnInspectionPending:i>=2 && i<=5,notes:"運用の流れを試すための架空データです。施設の点検基準を示すものではありません。"}});
      await appendAuditLog(tx,actor,{action:"CREATE",resourceType:"MedicalDevice",resourceId:device.id,after:device});
      if (i===1 || i===2) {
        const loan = await tx.medicalLoan.create({data:{organizationId,deviceId:device.id,departmentId:department.id,destinationName:department.name,destinationLocation:"架空の病棟機器置場",loanedById:actor.id,loanedAt:earlier}});
        await appendAuditLog(tx,actor,{action:"CREATE",resourceType:"MedicalLoan",resourceId:loan.id,after:loan});
        if (i===2) {
          const returned = await tx.medicalLoan.update({where:{id:loan.id},data:{returnedAt:now,returnedById:actor.id}});
          await appendAuditLog(tx,actor,{action:"UPDATE",resourceType:"MedicalLoan",resourceId:loan.id,before:loan,after:returned});
        }
      }
      if (i===0 || i===3) {
        const inspection = await tx.medicalInspection.create({data:{organizationId,deviceId:device.id,inspectedById:actor.id,kind:"PERIODIC",result:i===0 ? "PASSED" : "FAILED",inspectionDate:i===0 ? inspectionDate : new Date(inspectionDate.getTime()-2*86400000),content:i===0 ? "架空の点検合格例。施設の手順に従った記録をここへ入力します。" : "架空の不合格例。再点検または修理が必要な状態です。",nextInspectionDate:new Date(inspectionDate.getTime()+(i===0 ? 7 : -1)*86400000)}});
        await appendAuditLog(tx,actor,{action:"CREATE",resourceType:"MedicalInspection",resourceId:inspection.id,after:inspection});
      }
      if (i===4 || i===5) {
        const repair = await tx.medicalRepair.create({data:{organizationId,deviceId:device.id,reportedById:actor.id,problem:"架空の電源不具合。運用の流れを確認する例です。",reportedAt:earlier}});
        await appendAuditLog(tx,actor,{action:"CREATE",resourceType:"MedicalRepair",resourceId:repair.id,after:repair});
        const started = await tx.medicalRepair.update({where:{id:repair.id},data:{status:"IN_PROGRESS",startedAt:earlier}});
        await appendAuditLog(tx,actor,{action:"UPDATE",resourceType:"MedicalRepair",resourceId:repair.id,before:repair,after:started});
        if (i===5) {
          const completed = await tx.medicalRepair.update({where:{id:repair.id},data:{status:"COMPLETED",completedAt:now,completionContent:"架空の部品交換例。運用再開と合格点検は未実施です。"}});
          await appendAuditLog(tx,actor,{action:"UPDATE",resourceType:"MedicalRepair",resourceId:repair.id,before:started,after:completed});
        }
      }
    }
    return true;
  },{isolationLevel:"Serializable"});
}
