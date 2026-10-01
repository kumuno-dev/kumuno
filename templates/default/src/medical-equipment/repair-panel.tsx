import Link from "next/link";
import type { MedicalDevice } from "../generated/prisma/client";
import { getDatabase } from "../database/client";
import { ManagementForm } from "../management/form";
import { medicalRepairAction } from "./repair-action";
import { repairStatuses } from "./repairs";
import { displayDate } from "./loans";
export async function MedicalRepairPanel({device,manage}:{device:MedicalDevice;manage:boolean}) {
  const db = getDatabase();
  const [open,history,loan] = await Promise.all([
    db.medicalRepair.findFirst({where:{deviceId:device.id,organizationId:device.organizationId,status:{not:"COMPLETED"}}}),
    db.medicalRepair.findMany({where:{deviceId:device.id,organizationId:device.organizationId},orderBy:[{reportedAt:"desc"},{id:"asc"}],take:10,include:{reportedBy:{select:{name:true}}}}),
    db.medicalLoan.findFirst({where:{deviceId:device.id,organizationId:device.organizationId,returnedAt:null}}),
  ]);
  return <section className="panel mt-6"><h2>修理管理</h2><p className="record-meta">修理依頼 → 対応中 → 修理完了。完了後も運用停止・点検待ちを維持します。台帳で運用中に戻し、合格点検を記録してから再貸出してください。</p>
    {open && <p className="mt-4">現在：{repairStatuses[open.status]}（貸出・点検の登録はできません）</p>}
    {manage && open && <ManagementForm action={medicalRepairAction} label={open.status === "REQUESTED" ? "対応を開始" : "修理完了を記録"}>
      <input name="operation" type="hidden" value={open.status === "REQUESTED" ? "start" : "complete"}/><input name="deviceId" type="hidden" value={device.id}/><input name="repairId" type="hidden" value={open.id}/>
      {open.status === "IN_PROGRESS" && <label>修理対応の内容（必須）<textarea name="completionContent" required maxLength={2000} rows={4}/></label>}
      <label className="confirm-label mt-4"><input name="confirm" type="checkbox" value="yes" required/>修理内容を確認しました</label>
    </ManagementForm>}
    {manage && !open && !loan && device.status !== "RETIRED" && <details className="mt-4"><summary>修理を依頼</summary><ManagementForm action={medicalRepairAction} label="修理依頼を登録"><input name="operation" type="hidden" value="request"/><input name="deviceId" type="hidden" value={device.id}/><label>不具合の内容（必須）<textarea name="problem" required maxLength={2000} rows={4}/></label><label className="confirm-label mt-4"><input name="confirm" type="checkbox" value="yes" required/>修理内容を確認しました</label></ManagementForm></details>}
    {loan && <p className="record-meta mt-4">貸出中です。修理依頼の前に返却を記録してください。</p>}
    <h3 className="mt-6">履歴（最新10件）</h3>{history.length === 0 && <p className="record-meta">修理記録はありません。</p>}
    {history.map(i=><article className="record" key={i.id}><div className="record-heading"><h3>{displayDate(i.reportedAt)}（日本時間）</h3><span className="badge">{repairStatuses[i.status]}</span></div><p className="record-meta">依頼者：{i.reportedBy.name}{i.startedAt && ` · 開始：${displayDate(i.startedAt)}`}{i.completedAt && ` · 完了：${displayDate(i.completedAt)}`}</p><p className="whitespace-pre-wrap break-words">不具合：{i.problem}</p>{i.completionContent && <p className="whitespace-pre-wrap break-words">修理対応：{i.completionContent}</p>}</article>)}
    <Link className="inline-block mt-6 text-orange-800 underline" href={`/dashboard/medical-repairs?q=${encodeURIComponent(device.managementNumber)}`}>修理記録一覧へ</Link>
  </section>;
}
