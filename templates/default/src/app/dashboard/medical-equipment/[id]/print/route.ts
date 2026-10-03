import { renderPrintDocument, PRINT_HEADERS } from "@kumuno/print";
import { requirePermission } from "@/authorization/require-permission";
import { getDatabase } from "@/database/client";
import { medicalDeviceDetail } from "@/medical-equipment/repository";
import { identifier } from "@/management/validation";
import { statuses } from "@/medical-equipment/validation";
export async function GET(_request: Request, {params}: {params: Promise<{id:string}>}) {
  const actor = await requirePermission("medical-equipment:read");
  const {id} = await params;
  try { identifier(id); } catch { return new Response("帳票が見つかりません。", {status:404, headers:PRINT_HEADERS}); }
  const device = await medicalDeviceDetail(getDatabase(), actor.organizationId, id);
  if(!device) return new Response("帳票が見つかりません。", {status:404, headers:PRINT_HEADERS});
  const fields = [
    {label:"機器名",value:device.name}, {label:"機器管理番号",value:device.managementNumber},
    {label:"資産管理番号",value:device.assetNumber}, {label:"種別",value:device.category},
    {label:"メーカー",value:device.manufacturer}, {label:"型式",value:device.modelName},
    {label:"シリアル番号",value:device.serialNumber}, {label:"所属部署",value:device.department?.name ?? null},
    {label:"設置場所",value:device.location}, {label:"台帳上の状態",value:statuses[device.status]},
    {label:"購入日",value:device.purchaseDate?.toISOString().slice(0,10) ?? null},
    {label:"保証期限",value:device.warrantyUntil?.toISOString().slice(0,10) ?? null},
    {label:"返却後の点検",value:device.returnInspectionPending ? "点検待ち" : "点検待ちではありません"},
    {label:"貸出状況",value:device.loans[0] ? `貸出中：${device.loans[0].destinationName}` : "貸出なし"},
  ];
  return new Response(renderPrintDocument({ title:"医療機器 台帳票",
    subtitle:device.isSample ? "【テスト機器】架空のデータです" : "機器管理情報",
    fields, footer:`KUMUNO / 医療機器管理\n発行日時：${new Date().toLocaleString("ja-JP", {timeZone:"Asia/Tokyo"})}（日本時間）\n発行時点の台帳情報です。実際の貸出可否は最新の画面で確認してください。`,
  }), {headers:PRINT_HEADERS});
}
