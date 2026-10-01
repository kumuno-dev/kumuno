import Link from "next/link";
import { requirePermission } from "@/authorization/require-permission";
import { getDatabase } from "@/database/client";
import { medicalLoanList, loanQuery, displayDate } from "@/medical-equipment/loans";
export default async function MedicalLoansPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const actor = await requirePermission("medical-equipment:read");
  const query = loanQuery(await searchParams), result = await medicalLoanList(getDatabase(),actor.organizationId,query);
  const href = (page:number,returned=query.returned) => `/dashboard/medical-loans?${new URLSearchParams({q:query.q,state:returned ? "returned" : "active",page:String(page)})}`;
  return <><p className="eyebrow">MEDICAL LOANS</p><h1>医療機器の貸出・返却</h1><p className="page-description">機器詳細から貸出・返却を記録できます。日時は日本時間です。</p><Link className="text-orange-800 underline" href="/dashboard/medical-equipment">医療機器台帳から機器を選ぶ →</Link>
    <section className="panel mt-6"><nav aria-label="貸出状態" className="flex gap-6"><Link aria-current={!query.returned ? "page" : undefined} href={href(1,false)}>貸出中</Link><Link aria-current={query.returned ? "page" : undefined} href={href(1,true)}>返却済み</Link></nav>
    <form method="get" className="management-form mb-6"><input type="hidden" name="state" value={query.returned ? "returned" : "active"}/><label>検索<input name="q" maxLength={120} defaultValue={query.q} placeholder="機器管理番号・機器名・貸出先の部署"/></label><button className="primary-button">検索する</button></form>
    <p className="record-meta">{query.returned ? "返却済み" : "貸出中"}：全{result.total}件</p>{result.rows.length === 0 && <p>該当する貸出記録はありません。</p>}
    <div className="record-list">{result.rows.map(l=><article key={l.id} className="record"><div className="record-heading"><Link className="text-orange-800 underline" href={`/dashboard/medical-equipment/${l.deviceId}`}><h2>{l.device.managementNumber} · {l.device.name}</h2></Link><span className="badge">{l.returnedAt ? "返却済み" : "貸出中"}</span></div><p>貸出先：{l.destinationName}{l.destinationLocation && ` / ${l.destinationLocation}`}</p><p className="record-meta">貸出：{displayDate(l.loanedAt)} · {l.loanedBy.name}{l.returnedAt && <><br/>返却：{displayDate(l.returnedAt)} · {l.returnedBy?.name}</>}</p></article>)}</div>
    <nav aria-label="ページ切替" className="flex flex-wrap items-center gap-6 mt-8">{result.page > 1 && <Link href={href(result.page-1)}>前のページ</Link>}<span>{result.page} / {result.pages}ページ</span>{result.page < result.pages && <Link href={href(result.page+1)}>次のページ</Link>}</nav></section></>;
}
