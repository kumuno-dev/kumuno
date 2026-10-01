import Link from "next/link";
import { MedicalLoanPanel } from "@/medical-equipment/loan-panel";
import { notFound } from "next/navigation";
import { requirePermission } from "@/authorization/require-permission";
import { can } from "@/authorization/policy";
import { getDatabase } from "@/database/client";
import { medicalDeviceDetail } from "@/medical-equipment/repository";
import { MedicalDeviceForm } from "@/medical-equipment/form";
import { identifier } from "@/management/validation";
import { statuses } from "@/medical-equipment/validation";
export default async function MedicalDeviceDetailPage({ params }: { params: Promise<{id:string}> }) {
  const actor = await requirePermission("medical-equipment:read"), { id } = await params;
  try { identifier(id); } catch { notFound(); }
  const e = await medicalDeviceDetail(getDatabase(),actor.organizationId,id);
  if (!e) notFound();
  const fields = [["機器管理番号",e.managementNumber],["資産管理番号",e.assetNumber],["種別",e.category],["メーカー",e.manufacturer],["型式",e.modelName],["シリアル番号",e.serialNumber],["所属部署",e.department?.name],["設置場所",e.location],["購入日",e.purchaseDate?.toISOString().slice(0,10)],["保証期限",e.warrantyUntil?.toISOString().slice(0,10)]];
  return <><Link href="/dashboard/medical-equipment">← 医療機器台帳</Link><h1 className="mt-6">{e.name}</h1><p className="page-description">{e.managementNumber} · {statuses[e.status]}</p><section className="panel"><h2>医療機器の詳細</h2><dl className="form-grid mt-6">{fields.map(([label,value]) => <div key={label}><dt>{label}</dt><dd className="break-words">{value ?? "未設定"}</dd></div>)}</dl><h3 className="mt-6">備考</h3><p className="whitespace-pre-wrap break-words mt-2">{e.notes ?? "なし"}</p></section>
    <MedicalLoanPanel device={e} manage={can(actor,"medical-equipment:manage",actor)} />
    {can(actor,"medical-equipment:manage",actor) && <details className="panel mt-6"><summary>医療機器を編集</summary><MedicalDeviceForm organizationId={actor.organizationId} device={e} /></details>}</>;
}
