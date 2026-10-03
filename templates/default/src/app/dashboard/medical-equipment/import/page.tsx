import Link from "next/link";
import { requirePermission } from "@/authorization/require-permission";
import { MedicalImportForm } from "@/medical-equipment/import-form";
export default async function ImportPage(){
  await requirePermission("medical-equipment:manage");
  return <><Link href="/dashboard/medical-equipment">← 医療機器台帳</Link><h1 className="mt-6">CSVから医療機器を登録</h1><p className="page-description">新しい機器を確認してから一括登録します。全件を同時に保存し、エラー時は全体を取り消します。</p><p className="mb-6"><a download="medical-import-template.csv" className="underline" href="/dashboard/medical-equipment/import/template">取込用CSVひな形をダウンロード</a></p><MedicalImportForm/></>;
}
