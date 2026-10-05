import { DepartmentFields } from "@kumuno/admin";
import { requireUser } from "@/authentication/require-user";
import { can } from "@/authorization/policy";
import { getDatabase } from "@/database/client";
import { departmentAction, deleteDepartmentAction } from "@/management/actions";
import { ManagementForm } from "@/management/form";
export default async function DepartmentsPage() {
  const actor = await requireUser();
  if (!can(actor, "departments:read", actor)) return <><h1>アクセスできません</h1><p>部署の参照権限が必要です。</p></>;
  const departments = await getDatabase().department.findMany({ where: { organizationId: actor.organizationId }, select: { id: true, code: true, name: true, parentId: true, _count: { select: { users: true, children: true } } }, orderBy: [{ code: "asc" }, { id: "asc" }] });
  const editable = can(actor, "departments:manage", actor);
  const fields = (department?: typeof departments[number]) => <DepartmentFields department={department} departments={departments} />;
  return <><p className="eyebrow">ORGANIZATION</p><h1>部署</h1><p className="page-description">部署と親子関係を整えます。全{departments.length}部署</p>{editable && <details className="panel create-panel"><summary>部署を登録</summary><ManagementForm action={departmentAction} label="登録する">{fields()}</ManagementForm></details>}<section className="panel"><h2>部署一覧</h2>{departments.length === 0 && <p>部署はまだ登録されていません。</p>}<div className="record-list">{departments.map(d => <article className="record" key={d.id}><div className="record-heading"><div><h3>{d.name}</h3><p>{d.code}</p></div><span className="badge">{d._count.users}名</span></div><p className="record-meta">親部署：{departments.find(parent => parent.id === d.parentId)?.name ?? "なし（最上位）"} · 子部署 {d._count.children}件</p>{editable && <details><summary>{d.name}を編集</summary><ManagementForm action={departmentAction} key={`${d.id}-${d.name}-${d.code}-${d.parentId}`}>{fields(d)}</ManagementForm>{d._count.users || d._count.children ? <p className="record-meta mt-4">所属ユーザー・子部署がある部署は削除できません。</p> : <div className="delete-section"><ManagementForm action={deleteDepartmentAction} label="部署を削除"><input type="hidden" name="id" value={d.id} /><label className="confirm-label"><input type="checkbox" name="confirm" value="yes" required />この部署を削除することを確認しました</label></ManagementForm></div>}</details>}</article>)}</div></section></>;
}
