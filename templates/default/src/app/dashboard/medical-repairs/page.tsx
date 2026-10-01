import Link from "next/link";
import { requirePermission } from "@/authorization/require-permission";
import { getDatabase } from "@/database/client";
import { medicalRepairList,repairQuery,repairStatuses } from "@/medical-equipment/repairs";
import { displayDate } from "@/medical-equipment/loans";
export default async function MedicalRepairsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const actor = await requirePermission("medical-equipment:read"), query = repairQuery(await searchParams);
  const result = await medicalRepairList(getDatabase(),actor.organizationId,query);
  const href = (page:number)=>`/dashboard/medical-repairs?${new URLSearchParams({q:query.q,status:query.status ?? "",page:String(page)})}`;
  return <><p className="eyebrow">MEDICAL REPAIRS</p><h1>医療機器の修理記録</h1><p className="page-description">機器詳細から修理を依頼します。完了後は運用再開と合格点検を確認してから再貸出してください。</p><Link className="text-orange-800 underline" href="/dashboard/medical-equipment">医療機器台帳から機器を選ぶ →</Link>
    <section className="panel mt-6"><form className="management-form mb-6" method="get"><div className="form-grid"><label>検索<input name="q" maxLength={120} defaultValue={query.q} placeholder="機器管理番号・機器名"/></label><label>修理状態<select aria-label="修理状態" name="status" defaultValue={query.status ?? ""}><option value="">すべて</option>{Object.entries(repairStatuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div><button className="primary-button">検索する</button></form><p className="record-meta">全{result.total}件</p>{result.rows.length === 0 && <p>該当する修理記録はありません。</p>}
    <div className="record-list">{result.rows.map(i=><article className="record" key={i.id}><div className="record-heading"><Link className="text-orange-800 underline" href={`/dashboard/medical-equipment/${i.deviceId}`}><h2>{i.device.managementNumber} · {i.device.name}</h2></Link><span className="badge">{repairStatuses[i.status]}</span></div><p className="record-meta">依頼：{displayDate(i.reportedAt)}（日本時間） · {i.reportedBy.name}{i.completedAt && ` · 完了：${displayDate(i.completedAt)}`}</p><p className="whitespace-pre-wrap break-words">不具合：{i.problem}</p>{i.completionContent && <p className="whitespace-pre-wrap break-words">修理対応：{i.completionContent}</p>}</article>)}</div><nav aria-label="ページ切替" className="flex flex-wrap items-center gap-6 mt-8">{result.page > 1 && <Link href={href(result.page-1)}>前のページ</Link>}<span>{result.page} / {result.pages}ページ</span>{result.page < result.pages && <Link href={href(result.page+1)}>次のページ</Link>}</nav></section></>;
}
