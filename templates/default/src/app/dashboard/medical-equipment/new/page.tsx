import Link from "next/link";
import { requireUser } from "@/authentication/require-user";
import { can } from "@/authorization/policy";
import { MedicalDeviceForm } from "@/medical-equipment/form";
export default async function NewMedicalDevicePage() {
  const actor = await requireUser();
  if (!can(actor,"medical-equipment:manage",actor)) return <><h1>アクセスできません</h1><p>医療機器の管理権限が必要です。</p></>;
  return <><Link href="/dashboard/medical-equipment">← 医療機器台帳</Link><h1 className="mt-6 mb-6">医療機器を登録</h1><section className="panel"><MedicalDeviceForm organizationId={actor.organizationId} /></section></>;
}
