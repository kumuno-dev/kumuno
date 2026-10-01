import Link from "next/link";
import { requireUser } from "@/authentication/require-user";
import { can } from "@/authorization/policy";
import { LogoutButton } from "./logout-button";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireUser();
  return <div className="business-shell">
    <a className="skip-link" href="#main-content">本文へ移動</a>
    <header className="business-header"><Link className="brand" href="/dashboard">KUMUNO<span>業務ワークスペース</span></Link><div className="account"><span>{actor.name}</span><LogoutButton /></div></header>
    <div className="business-body"><aside className="business-sidebar"><p className="nav-caption">ワークスペース</p><nav aria-label="業務メニュー"><Link href="/dashboard">ダッシュボード</Link><Link href="/dashboard/equipment">備品</Link><Link href="/dashboard/medical-equipment">医療機器台帳</Link><Link href="/dashboard/medical-loans">医療機器の貸出・返却</Link><Link href="/dashboard/medical-inspections">医療機器の点検記録</Link><Link href="/dashboard/medical-repairs">医療機器の修理記録</Link>{can(actor, "users:read", actor) && <Link href="/dashboard/users">ユーザー</Link>}{can(actor, "departments:read", actor) && <Link href="/dashboard/departments">部署</Link>}</nav><p className="sidebar-note">小さく作る。<br />将来つながる。</p></aside><main id="main-content" className="business-main">{children}</main></div>
  </div>;
}
