import Link from "next/link";
import { includeMedicalSamples } from "@/medical-equipment/sample-preference";
import { requirePermission } from "@/authorization/require-permission";
import { MedicalSampleSelector } from "@/medical-equipment/sample-selector";
import { availabilityLabels } from "@/medical-equipment/availability";
import { can } from "@/authorization/policy";
import { getDatabase } from "@/database/client";
import { medicalDeviceList } from "@/medical-equipment/repository";
import { listQuery, statuses } from "@/medical-equipment/validation";
export default async function MedicalDevicePage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const actor = await requirePermission("medical-equipment:read");
  const query = listQuery(await searchParams), result = await medicalDeviceList(getDatabase(),actor.organizationId,query,await includeMedicalSamples(actor.organizationId));
  const manage = can(actor,"medical-equipment:manage",actor);
  const href = (page: number) => `/dashboard/medical-equipment?${new URLSearchParams({ q: query.q, status: query.status ?? "", availability:query.availability ?? "", page: String(page) })}`;
  const exportHref = `/dashboard/medical-equipment/export?${new URLSearchParams({q:query.q,status:query.status ?? "",availability:query.availability ?? ""})}`;
  return <><p className="eyebrow">MEDICAL EQUIPMENT</p><h1>医療機器台帳</h1><p className="page-description">管理番号・メーカー・設置場所から機器を探せます。全{result.total}件</p>
    <MedicalSampleSelector organizationId={actor.organizationId} manage={manage}/>
    {manage && <Link className="primary-button inline-block mb-6" href="/dashboard/medical-equipment/new">医療機器を登録</Link>}
    <p className="mb-6"><a className="font-semibold underline" href={exportHref}>現在の条件でCSV出力</a><span className="block text-sm mt-2">検索条件とテストデータの選択を反映し、全ページの機器を出力します（最大1000台）。</span></p>
    <section className="panel"><form method="get" className="management-form mb-6"><div className="form-grid"><label>検索<input name="q" maxLength={120} defaultValue={query.q} placeholder="管理番号・機器名・メーカー・設置場所" /></label><label>台帳上の状態<select aria-label="台帳上の状態" name="status" defaultValue={query.status ?? ""}><option value="">すべて</option>{Object.entries(statuses).map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>運用状況<select aria-label="運用状況" name="availability" defaultValue={query.availability ?? ""}><option value="">すべて</option>{Object.entries(availabilityLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div><button className="primary-button">検索する</button></form>
    {result.rows.length === 0 && <p>{query.q || query.status || query.availability ? "該当する医療機器はありません。条件を変更してください。" : manage ? "まずExcelにある機器を1台登録してください。機器管理番号・機器名・種別だけで始められます。" : "医療機器はまだ登録されていません。管理者に登録を依頼してください。"}</p>}
    <div className="record-list">{result.rows.map(e => <article className="record" key={e.id}><div className="record-heading"><Link className="text-orange-800 underline" href={`/dashboard/medical-equipment/${e.id}`}><h2>{e.managementNumber} · {e.name}</h2></Link><span className="badge">{statuses[e.status]}</span></div><p className="record-meta">{e.loans[0] ? `貸出中：${e.loans[0].destinationName}${e.loans[0].destinationLocation ? " / " + e.loans[0].destinationLocation : ""}` : e.returnInspectionPending ? "点検待ち" : "現在の貸出記録なし"}</p><p className="record-meta">{e.category} · {e.manufacturer ?? "メーカー未設定"} / {e.modelName ?? "型式未設定"}</p><p className="record-meta">{e.department?.name ?? "所属部署未設定"} · {e.location ?? "設置場所未設定"} · 資産番号: {e.assetNumber ?? "未設定"}</p></article>)}</div>
    <nav aria-label="ページ切替" className="flex flex-wrap items-center gap-6 mt-8">{result.page > 1 && <Link href={href(result.page-1)}>前のページ</Link>}<span>{result.page} / {result.pages}ページ</span>{result.page < result.pages && <Link href={href(result.page+1)}>次のページ</Link>}</nav></section></>;
}
