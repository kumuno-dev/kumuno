import { getDatabase } from "../database/client";
import { ManagementForm } from "../management/form";
import { medicalDeviceAction } from "./actions";
import { statuses } from "./validation";
import type { MedicalDevice } from "../generated/prisma/client";
export async function MedicalDeviceForm({ organizationId, device }: { organizationId: string; device?: MedicalDevice }) {
  const departments = await getDatabase().department.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const fields = [
    ["managementNumber","機器管理番号",80,true], ["assetNumber","資産管理番号",80,false],
    ["name","機器名",120,true], ["category","種別",80,true], ["manufacturer","メーカー",120,false],
    ["modelName","型式",120,false], ["serialNumber","シリアル番号",120,false], ["location","設置場所",120,false],
  ] as const;
  return <ManagementForm action={medicalDeviceAction}><div className="form-grid">
    <input name="id" type="hidden" value={device?.id ?? ""} />
    {fields.map(([key,label,max,required]) => <label key={key}>{label}{required && "（必須）"}<input name={key} maxLength={max} required={required} defaultValue={device?.[key] ?? ""} /></label>)}
    <label>所属部署<select aria-label="所属部署" name="departmentId" defaultValue={device?.departmentId ?? ""}><option value="">未設定</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    <label>購入日<input name="purchaseDate" type="date" defaultValue={device?.purchaseDate?.toISOString().slice(0,10)} /></label>
    <label>保証期限<input name="warrantyUntil" type="date" defaultValue={device?.warrantyUntil?.toISOString().slice(0,10)} /></label>
    <label>台帳上の状態<select aria-label="台帳上の状態" name="status" defaultValue={device?.status ?? "IN_SERVICE"}>{Object.entries(statuses).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label>備考<textarea name="notes" rows={4} maxLength={2000} defaultValue={device?.notes ?? ""} /></label>
  </div><p className="record-meta">運用中は台帳上の状態です。貸出可否・点検結果は今後の工程で管理します。</p></ManagementForm>;
}
