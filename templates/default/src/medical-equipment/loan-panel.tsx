import Link from "next/link";
import { getDatabase } from "../database/client";
import { ManagementForm } from "../management/form";
import { lendMedicalDeviceAction, returnMedicalDeviceAction } from "./loan-actions";
import { displayDate,withReturnTimes } from "./loans";
import type { MedicalDevice } from "../generated/prisma/client";
export async function MedicalLoanPanel({device,manage}:{device:MedicalDevice;manage:boolean}) {
  const db = getDatabase();
  const [current,storedHistory,departments] = await Promise.all([
    db.medicalLoan.findFirst({where:{deviceId:device.id,organizationId:device.organizationId,returnedAt:null}}),
    db.medicalLoan.findMany({where:{deviceId:device.id,organizationId:device.organizationId,returnedAt:{not:null}},orderBy:[{loanedAt:"desc"},{id:"asc"}],take:10,include:{loanedBy:{select:{name:true}},returnedBy:{select:{name:true}}}}),
    manage ? db.department.findMany({where:{organizationId:device.organizationId},select:{id:true,name:true},orderBy:{name:"asc"}}) : Promise.resolve([]),
  ]);
  const history = await withReturnTimes(db,device.organizationId,storedHistory);
  return <section className="panel mt-6"><h2>貸出・返却</h2>
    {current ? <><p className="mt-4">貸出中：{current.destinationName}{current.destinationLocation && ` / ${current.destinationLocation}`}</p><p className="record-meta">貸出日時：{displayDate(current.loanedAt)}（日本時間）</p>
      {manage && <ManagementForm action={returnMedicalDeviceAction} label="返却を記録"><input type="hidden" name="loanId" value={current.id}/><label className="confirm-label"><input type="checkbox" name="confirm" value="yes" required/>機器の返却を確認しました</label><p className="record-meta">返却後は点検待ちになり、再貸出を止めます。</p></ManagementForm>}</>
      : device.returnInspectionPending ? <p className="mt-4">返却後の点検待ちです。点検記録で合格を登録すると、運用中の機器は再貸出できます。</p>
      : device.status !== "IN_SERVICE" ? <p className="mt-4">運用停止・廃棄済みのため貸出できません。</p>
      : manage ? departments.length > 0 ? <ManagementForm action={lendMedicalDeviceAction} label="貸出を登録"><input type="hidden" name="deviceId" value={device.id}/><div className="form-grid"><label>貸出先の部署（必須）<select aria-label="貸出先の部署（必須）" name="departmentId" required defaultValue=""><option value="" disabled>部署を選択</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>貸出先の場所<input name="destinationLocation" maxLength={120} placeholder="例：3病棟の機器置場"/></label></div></ManagementForm>
      : <p className="mt-4">先に部署マスタへ貸出先を登録してください。</p>
      : <p className="mt-4">現在の貸出記録はありません。</p>}
    <h3 className="mt-8">返却済みの履歴（最新10件）</h3>{history.length === 0 && <p className="record-meta">返却済みの履歴はありません。</p>}
    {history.map(l=><article key={l.id} className="record"><p>{l.destinationName}{l.destinationLocation && ` / ${l.destinationLocation}`}</p><p className="record-meta">貸出：{displayDate(l.loanedAt)} · {l.loanedBy.name}<br/>返却：{l.returnedAt && displayDate(l.returnedAt)} · {l.returnedBy?.name}（日本時間）</p></article>)}
    <Link className="inline-block mt-6 text-orange-800 underline" href={`/dashboard/medical-loans?state=returned&q=${encodeURIComponent(device.managementNumber)}`}>貸出・返却一覧へ</Link>
  </section>;
}
