import { CsvError } from "@kumuno/csv";
import { requirePermission } from "@/authorization/require-permission";
import { getDatabase } from "@/database/client";
import { exportMedicalDevices } from "@/medical-equipment/csv-export";
import { includeMedicalSamples } from "@/medical-equipment/sample-preference";
import { listQuery } from "@/medical-equipment/validation";
const privateHeaders = {"Cache-Control":"private, no-store", Vary:"Cookie", "X-Content-Type-Options":"nosniff", "Referrer-Policy":"no-referrer"};
export async function GET(request: Request) {
  const actor = await requirePermission("medical-equipment:read");
  const params = new URL(request.url).searchParams;
  const input: Record<string,string|string[]> = {};
  for (const key of params.keys()) { const values = params.getAll(key); input[key] = values.length === 1 ? values[0] : values; }
  try {
    const csv = await exportMedicalDevices(getDatabase(),actor.organizationId,listQuery(input),await includeMedicalSamples(actor.organizationId));
    return new Response(csv, {headers:{...privateHeaders, "Content-Type":"text/csv; charset=utf-8", "Content-Disposition":'attachment; filename="medical-devices.csv"'}});
  } catch(error) {
    if (!(error instanceof CsvError)) throw error;
    const message = error.code === "FORMULA_PREFIX"
      ? `CSV出力を中止しました。${error.row - 1}件目・${error.column}列目に数式として解釈される可能性がある値があります。台帳の該当項目を確認してください。`
      : "CSV出力を中止しました。一度に出力できるのは1000台・2MiBまでです。検索条件を絞ってください。";
    return new Response(message, {status:422, headers:{...privateHeaders,"Content-Type":"text/plain; charset=utf-8"}});
  }
}
