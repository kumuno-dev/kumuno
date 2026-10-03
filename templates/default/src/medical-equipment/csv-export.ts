import { CsvError, stringifyCsv } from "@kumuno/csv";
import type { PrismaClient } from "../generated/prisma/client";
import { medicalDeviceWhere } from "./repository";
import { statuses, type listQuery } from "./validation";
export const medicalCsvHeaders = ["機器管理番号", "機器名", "資産管理番号", "種別", "メーカー", "型式", "シリアル番号", "所属部署", "設置場所", "購入日", "保証期限", "台帳上の状態", "返却後の点検", "現在の貸出先", "テスト機器"];
export const medicalCsvMaxDevices = 1000;
export async function exportMedicalDevices(db: PrismaClient, organizationId: string, query: ReturnType<typeof listQuery>, includeSamples: boolean) {
  return db.$transaction(async tx => {
    const devices = await tx.medicalDevice.findMany({
      where: medicalDeviceWhere(organizationId, query, includeSamples),
      orderBy: [{managementNumber:"asc"}, {id:"asc"}], take: medicalCsvMaxDevices + 1,
      select: { managementNumber:true, name:true, assetNumber:true, category:true, manufacturer:true, modelName:true,
        serialNumber:true, location:true, purchaseDate:true, warrantyUntil:true, status:true, returnInspectionPending:true, isSample:true,
        department:{select:{name:true}}, loans:{where:{returnedAt:null},take:1,select:{destinationName:true}},
      },
    });
    if (devices.length > medicalCsvMaxDevices) throw new CsvError("MAX_DEVICES");
    const rows = devices.map(device => [device.managementNumber, device.name, device.assetNumber, device.category, device.manufacturer,
      device.modelName, device.serialNumber, device.department?.name ?? null, device.location,
      device.purchaseDate?.toISOString().slice(0,10) ?? null, device.warrantyUntil?.toISOString().slice(0,10) ?? null,
      statuses[device.status], device.returnInspectionPending ? "点検待ち" : "点検待ちではありません",
      device.loans[0]?.destinationName ?? "貸出なし", device.isSample ? "はい（架空）" : "いいえ"]);
    return stringifyCsv({headers:medicalCsvHeaders, rows});
  }, {isolationLevel:"RepeatableRead"});
}
