import { UserFields } from "@kumuno/admin";
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
  const fields = (user?: typeof users[number]) => <UserFields user={user} departments={departments} />;
  return <><p className="eyebrow">ORGANIZATION</p><h1>ユーザー</h1><p className="page-description">メンバーの所属とアクセス権限を管理します。全{users.length}名</p>
    {editable && <details className="panel create-panel"><summary>ユーザーを登録</summary><ManagementForm action={userAction} label="登録する">{fields()}</ManagementForm></details>}
    <section className="panel"><h2>ユーザー一覧</h2>{users.length === 0 && <p>ユーザーはまだ登録されていません。</p>}<div className="record-list">{users.map(user => <article className="record" key={user.id}><div className="record-heading"><div><h3>{user.name}</h3><p className="break-all">{user.email}</p></div><span className={user.isActive ? "badge" : "badge inactive"}>{user.isActive ? "有効" : "無効"}</span></div><p className="record-meta">{user.role} · {departments.find(d => d.id === user.departmentId)?.name ?? "未所属"} · 社員番号 {user.employeeCode ?? "未設定"}</p>{editable && <details><summary>{user.name}を編集</summary><ManagementForm key={`${user.id}-${user.role}-${user.isActive}-${user.departmentId}-${user.email}-${user.name}`} action={userAction}>{fields(user)}</ManagementForm></details>}</article>)}</div></section></>;
}
