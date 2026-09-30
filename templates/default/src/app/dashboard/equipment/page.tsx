import Link from "next/link";
import { requirePermission } from "@/authorization/require-permission";
import { can } from "@/authorization/policy";
import { getDatabase } from "@/database/client";
import { equipmentList } from "@/equipment/repository";
import { listQuery, statuses } from "@/equipment/validation";
export default async function EquipmentPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const actor = await requirePermission("equipment:read");
  const query = listQuery(await searchParams), result = await equipmentList(getDatabase(), actor.organizationId, query);
  const href = (page: number) => `/dashboard/equipment?${new URLSearchParams({ q: query.q, sort: query.sort, page: String(page) })}`;
  return <><p className="eyebrow">EQUIPMENT</p><h1>備品</h1><p className="page-description">備品の状態・所属・担当者を管理します。全{result.total}件</p>{can(actor,"equipment:manage",actor) && <Link className="primary-button inline-block mb-6" href="/dashboard/equipment/new">備品を登録</Link>}
    <section className="panel"><form className="management-form mb-6" method="get"><div className="form-grid"><label>検索<input name="q" maxLength={120} defaultValue={query.q} placeholder="備品名・カテゴリ" /></label><label>並び順<select name="sort" defaultValue={query.sort}><option value="name">名前順</option><option value="newest">新しい順</option><option value="price">価格が高い順</option></select></label></div><button className="primary-button">検索する</button></form>
    {result.rows.length === 0 && <p>該当する備品はありません。</p>}<div className="record-list">{result.rows.map(e => <article key={e.id} className="record"><div className="record-heading"><Link className="text-orange-800 underline" href={`/dashboard/equipment/${e.id}`}><h2>{e.name}</h2></Link><span className="badge">{statuses[e.status]}</span></div><p className="record-meta">{e.category} · {e.department?.name ?? "部署未設定"} · {e.assignedUser?.name ?? "担当者未設定"} · {e.purchasePrice?.toString() ?? "価格未設定"}{e.purchasePrice !== null && "円"}</p></article>)}</div>
    <nav aria-label="ページ切替" className="flex flex-wrap items-center gap-6 mt-8">{result.page > 1 && <Link href={href(result.page-1)}>前のページ</Link>}<span>{result.page} / {result.pages}ページ</span>{result.page < result.pages && <Link href={href(result.page+1)}>次のページ</Link>}</nav></section></>;
}
