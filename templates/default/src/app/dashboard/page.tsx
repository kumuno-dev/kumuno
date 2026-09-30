import Link from "next/link";
import { requirePermission } from "@/authorization/require-permission";
import { can } from "@/authorization/policy";
export default async function DashboardPage() {
  const actor = await requirePermission("dashboard:read");
  return <><p className="eyebrow">WORKSPACE</p><h1>ようこそ、{actor.name}さん</h1><p className="page-description">組織の情報を整えて、毎日の業務を始めましょう。</p><div className="overview-grid"><Link className="overview-card" href="/dashboard/equipment"><h2>備品</h2><p>備品の状態・所属・担当者を確認します。</p><span>備品一覧へ →</span></Link>{can(actor, "users:read", actor) && <Link className="overview-card" href="/dashboard/users"><h2>ユーザー</h2><p>メンバーの所属・ロール・利用状態を確認します。</p><span>ユーザー一覧へ →</span></Link>}{can(actor, "departments:read", actor) && <Link className="overview-card" href="/dashboard/departments"><h2>部署</h2><p>組織の部署と、親子関係を管理します。</p><span>部署一覧へ →</span></Link>}</div><section className="panel mt-8"><h2>業務の基盤が整いました</h2><p className="mt-3 text-slate-600">備品・ユーザー・部署を同じ組織情報で管理できます。</p></section></>;
}
