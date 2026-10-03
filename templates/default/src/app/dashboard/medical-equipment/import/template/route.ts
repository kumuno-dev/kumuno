import { stringifyCsv } from "@kumuno/csv";
import { requirePermission } from "@/authorization/require-permission";
export async function GET(){
  await requirePermission("medical-equipment:manage");
  const csv=stringifyCsv({headers:["機器管理番号","機器名","種別","所属部署コード","メーカー","型式","設置場所"],rows:[]});
  return new Response(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="medical-import-template.csv"',"Cache-Control":"private, no-store",Vary:"Cookie","X-Content-Type-Options":"nosniff"}});
}
