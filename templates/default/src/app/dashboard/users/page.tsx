import { requireUser } from "@/authentication/require-user";
import { can } from "@/authorization/policy";
import { getDatabase } from "@/database/client";
import { userAction } from "@/management/actions";
import { ManagementForm } from "@/management/form";
export default async function UsersPage() {
  const actor = await requireUser();
  if (!can(actor, "users:read", actor)) return <><h1>アクセスできません</h1><p>ユーザーの参照権限が必要です。</p></>;
  const db = getDatabase();
  const [users, departments] = await Promise.all([
    db.user.findMany({ where: { organizationId: actor.organizationId }, select: { id: true, name: true, email: true, employeeCode: true, role: true, isActive: true, departmentId: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
    db.department.findMany({ where: { organizationId: actor.organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const editable = can(actor, "users:manage", actor);
  function fields(user?: typeof users[number]) { return <div className="form-grid">
    <input type="hidden" name="id" value={user?.id ?? ""} />
    <label>氏名<input name="name" required maxLength={120} defaultValue={user?.name} /></label>
    <label>メールアドレス<input name="email" type="email" required maxLength={254} defaultValue={user?.email} /></label>
    <label>社員番号<input name="employeeCode" maxLength={40} defaultValue={user?.employeeCode ?? ""} /></label>
    <label>所属部署<select name="departmentId" defaultValue={user?.departmentId ?? ""}><option value="">未所属</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    <label>ロール<select name="role" defaultValue={user?.role ?? "USER"}><option value="USER">User</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option></select></label>
    <label>利用状態<select name="isActive" defaultValue={String(user?.isActive ?? true)}><option value="true">有効</option><option value="false">無効</option></select></label>
    {!user && <div><label>初期パスワード<input name="password" type="password" autoComplete="new-password" aria-describedby="password-help" minLength={12} maxLength={128} required /></label><small id="password-help">12〜128文字。安全な経路で本人へ伝えてください。</small></div>}
  </div>; }
  return <><p className="eyebrow">ORGANIZATION</p><h1>ユーザー</h1><p className="page-description">メンバーの所属とアクセス権限を管理します。全{users.length}名</p>
    {editable && <details className="panel create-panel"><summary>ユーザーを登録</summary><ManagementForm action={userAction} label="登録する">{fields()}</ManagementForm></details>}
    <section className="panel"><h2>ユーザー一覧</h2>{users.length === 0 && <p>ユーザーはまだ登録されていません。</p>}<div className="record-list">{users.map(user => <article className="record" key={user.id}><div className="record-heading"><div><h3>{user.name}</h3><p className="break-all">{user.email}</p></div><span className={user.isActive ? "badge" : "badge inactive"}>{user.isActive ? "有効" : "無効"}</span></div><p className="record-meta">{user.role} · {departments.find(d => d.id === user.departmentId)?.name ?? "未所属"} · 社員番号 {user.employeeCode ?? "未設定"}</p>{editable && <details><summary>{user.name}を編集</summary><ManagementForm key={`${user.id}-${user.role}-${user.isActive}-${user.departmentId}-${user.email}-${user.name}`} action={userAction}>{fields(user)}</ManagementForm></details>}</article>)}</div></section></>;
}
