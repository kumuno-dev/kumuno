import { InputError, field, identifier } from "../management/validation";
import type { EquipmentStatus } from "../generated/prisma/enums";
export const statuses = { IN_USE: "使用中", STORAGE: "保管中", REPAIR: "修理中", DISPOSED: "廃棄済み" };
export function parseEquipment(form: FormData) {
  const id = field(form, "id", 36, false);
  const department = field(form, "departmentId", 36, false), user = field(form, "assignedUserId", 36, false);
  const date = field(form, "purchaseDate", 10, false), price = field(form, "purchasePrice", 15, false);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date || date < "0001-01-01")) throw new InputError("購入日を確認してください。");
  if (price && !/^\d{1,12}(\.\d{1,2})?$/.test(price)) throw new InputError("購入価格は0以上、小数2桁までで入力してください。");
  const status = field(form, "status");
  if (!Object.hasOwn(statuses, status)) throw new InputError("状態を確認してください。");
  return { id: id ? identifier(id) : undefined, name: field(form, "name"), category: field(form, "category", 80),
    purchaseDate: date ? new Date(date) : null, purchasePrice: price || null,
    departmentId: department ? identifier(department) : null, assignedUserId: user ? identifier(user) : null,
    status: status as EquipmentStatus, notes: field(form, "notes", 2000, false) || null };
}
export function listQuery(input: Record<string, string | string[] | undefined>) {
  const value = (key: string) => typeof input[key] === "string" ? input[key] as string : "";
  const q = value("q").trim().slice(0,120), sort = value("sort");
  const page = /^\d{1,6}$/.test(value("page")) ? Math.max(1, Number(value("page"))) : 1;
  return { q, sort: ["name", "newest", "price"].includes(sort) ? sort : "name", page, size: 10 };
}
