import Link from "next/link";
import type { MedicalDevice } from "../generated/prisma/client";
import { getDatabase } from "../database/client";
import { ManagementForm } from "../management/form";
import { medicalInspectionAction } from "./inspection-action";
import { inspectionResults,inspectionKinds,todayInJapan } from "./inspections";
import { displayDate } from "./loans";
export async function MedicalInspectionPanel({device,manage}:{device:MedicalDevice;manage:boolean}) {
  const [current,history,lastReturn] = await Promise.all([
    getDatabase().medicalLoan.findFirst({where:{deviceId:device.id,organizationId:device.organizationId,returnedAt:null}}),
    getDatabase().medicalInspection.findMany({where:{deviceId:device.id,organizationId:device.organizationId},orderBy:[{recordedAt:"desc"},{id:"asc"}],take:10,include:{inspectedBy:{select:{name:true}}}}),
    getDatabase().medicalLoan.findFirst({where:{deviceId:device.id,organizationId:device.organizationId,returnedAt:{not:null}},orderBy:[{loanedAt:"desc"},{id:"desc"}]}),
  ]);
  return <section className="panel mt-6"><h2>点検記録</h2>
    {manage && !current && device.status !== "RETIRED" && <details className="mt-4"><summary>点検を記録</summary><ManagementForm action={medicalInspectionAction} label="点検結果を保存">
      <input name="deviceId" type="hidden" value={device.id}/><input name="version" type="hidden" value={device.updatedAt.toISOString()}/>
      <div className="form-grid"><label>点検日（必須）<input name="inspectionDate" type="date" required max={todayInJapan()} defaultValue={todayInJapan()}/></label>
      <label>点検の種類<select aria-label="点検の種類" name="kind" defaultValue={device.returnInspectionPending && lastReturn ? "POST_RETURN" : "PERIODIC"}>{Object.entries(inspectionKinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>点検結果<select aria-label="点検結果" name="result" defaultValue="INCOMPLETE">{Object.entries(inspectionResults).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>次回点検予定日<input name="nextInspectionDate" type="date"/></label><label>実施した点検内容（必須）<textarea name="content" required rows={4} maxLength={2000} placeholder="施設の手順に沿って、実施内容と確認結果を記録してください。"/></label></div>
      <label className="confirm-label mt-4"><input name="confirm" type="checkbox" value="yes" required/>点検内容と結果を確認しました</label><p className="record-meta">合格した運用中の機器は点検待ちを解除します。不合格・未完了は再貸出を止めます。運用停止の解除は台帳で行い、点検を改めて記録してください。</p>
    </ManagementForm></details>}
    {current && <p className="record-meta mt-4">貸出中のため点検は登録できません。先に返却を記録してください。</p>}
    <h3 className="mt-6">履歴（最新10件）</h3>{history.length === 0 && <p className="record-meta">点検記録はありません。</p>}
    {history.map(i=><article className="record" key={i.id}><div className="record-heading"><h3>{i.inspectionDate.toISOString().slice(0,10)} · {inspectionKinds[i.kind]}</h3><span className="badge">{inspectionResults[i.result]}</span></div><p className="record-meta">担当：{i.inspectedBy.name} · 記録：{displayDate(i.recordedAt)}（日本時間）{i.clearedPending && " · 点検待ちを解除"}</p><p className="whitespace-pre-wrap break-words">{i.content}</p><p className="record-meta">次回予定：{i.nextInspectionDate?.toISOString().slice(0,10) ?? "未設定"}</p></article>)}
    <Link className="inline-block mt-6 text-orange-800 underline" href={`/dashboard/medical-inspections?q=${encodeURIComponent(device.managementNumber)}`}>点検記録一覧へ</Link>
  </section>;
}
