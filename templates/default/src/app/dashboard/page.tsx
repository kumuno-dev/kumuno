import { requirePermission } from "@/authorization/require-permission";
import { LogoutButton } from "./logout-button";
export default async function DashboardPage() {
  const user = await requirePermission("dashboard:read");
  return <main className="mx-auto max-w-3xl px-6 py-16">
    <p className="mb-8 text-xl font-bold">KUMUNO</p>
    <h1 className="text-3xl font-bold">ようこそ、{user.name}さん</h1>
    <p className="mt-5 mb-8 leading-7 text-slate-600">ログインできました。業務機能は今後追加されます。</p>
    <LogoutButton />
  </main>;
}
