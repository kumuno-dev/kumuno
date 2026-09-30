import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/authorization/require-permission";
import { can } from "@/authorization/policy";
import { getDatabase } from "@/database/client";
import { equipmentDetail } from "@/equipment/repository";
import { EquipmentForm } from "@/equipment/form";
import { identifier } from "@/management/validation";
import { statuses } from "@/equipment/validation";
import { ManagementForm } from "@/management/form";
import { deleteEquipmentAction } from "@/equipment/actions";
export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const actor = await requirePermission("equipment:read"), { id } = await params;
 try { identifier(id); } catch { notFound(); }
 const e = await equipmentDetail(getDatabase(),actor.organizationId,id);
 if (!e) notFound();
 return <><Link href="/dashboard/equipment">← 備品一覧</Link><h1 className="mt-6">{e.name}</h1><p className="page-description">{e.category} · {statuses[e.status]}</p><section className="panel"><h2>備品の詳細</h2><dl className="form-grid mt-6"><div><dt>購入日</dt><dd>{e.purchaseDate?.toISOString().slice(0,10) ?? "未設定"}</dd></div><div><dt>購入価格</dt><dd>{e.purchasePrice?.toString() ?? "未設定"}{e.purchasePrice !== null && "円"}</dd></div><div><dt>部署</dt><dd>{e.department?.name ?? "未設定"}</dd></div><div><dt>担当者</dt><dd>{e.assignedUser?.name ?? "未設定"}</dd></div></dl><h3 className="mt-6">備考</h3><p className="whitespace-pre-wrap break-words mt-2">{e.notes ?? "なし"}</p></section>{can(actor,"equipment:manage",actor) && <><details className="panel mt-6"><summary>備品を編集</summary><EquipmentForm organizationId={actor.organizationId} equipment={e} /></details><details className="panel mt-6"><summary>備品を削除</summary><ManagementForm action={deleteEquipmentAction} label="削除する"><input name="id" type="hidden" value={e.id} /><label className="confirm-label"><input type="checkbox" name="confirm" value="yes" required />この備品を削除することを確認しました</label></ManagementForm></details></>}</>;
}
