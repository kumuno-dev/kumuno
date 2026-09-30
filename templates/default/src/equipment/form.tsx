import { getDatabase } from "../database/client";
import { ManagementForm } from "../management/form";
import { equipmentAction } from "./actions";
import { statuses } from "./validation";
import type { Equipment } from "../generated/prisma/client";
export async function EquipmentForm({ organizationId, equipment }: { organizationId: string; equipment?: Equipment }) {
  const [departments, users] = await Promise.all([
    getDatabase().department.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getDatabase().user.findMany({ where: { organizationId, OR: [{ isActive: true }, ...(equipment?.assignedUserId ? [{ id: equipment.assignedUserId }] : [])] }, select: { id: true, name: true, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return <ManagementForm action={equipmentAction}><div className="form-grid">
    <input type="hidden" name="id" value={equipment?.id ?? ""} />
    <label>備品名<input name="name" required maxLength={120} defaultValue={equipment?.name} /></label>
    <label>カテゴリ<input name="category" required maxLength={80} defaultValue={equipment?.category} /></label>
    <label>購入日<input type="date" name="purchaseDate" defaultValue={equipment?.purchaseDate?.toISOString().slice(0,10)} /></label>
    <label>購入価格（円）<input type="number" name="purchasePrice" min="0" max="999999999999.99" step="0.01" defaultValue={equipment?.purchasePrice?.toString()} /></label>
    <label>部署<select name="departmentId" defaultValue={equipment?.departmentId ?? ""}><option value="">未設定</option>{departments.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
    <label>担当者<select name="assignedUserId" defaultValue={equipment?.assignedUserId ?? ""}><option value="">未設定</option>{users.map(u => <option value={u.id} key={u.id}>{u.name}{u.isActive ? "" : "（無効・変更してください）"}</option>)}</select></label>
    <label>状態<select name="status" defaultValue={equipment?.status ?? "STORAGE"}>{Object.entries(statuses).map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></label>
    <label>備考<textarea name="notes" maxLength={2000} rows={4} defaultValue={equipment?.notes ?? ""} /></label>
  </div></ManagementForm>;
}
