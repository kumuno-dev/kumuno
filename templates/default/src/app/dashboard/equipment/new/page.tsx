import Link from "next/link";
import { requireUser } from "@/authentication/require-user";
import { can } from "@/authorization/policy";
import { EquipmentForm } from "@/equipment/form";
export default async function NewEquipmentPage() {
 const actor = await requireUser();
 if (!can(actor,"equipment:manage",actor)) return <><h1>アクセスできません</h1><p>備品の管理権限が必要です。</p></>;
 return <><Link href="/dashboard/equipment">← 備品一覧</Link><h1 className="mt-6 mb-6">備品を登録</h1><section className="panel"><EquipmentForm organizationId={actor.organizationId} /></section></>;
}
