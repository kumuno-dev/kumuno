import { availabilityLabels,type Availability } from "./availability";
import { InputError, field, identifier } from "../management/validation";
import type { MedicalDeviceStatus } from "../generated/prisma/enums";
export const statuses = { IN_SERVICE: "運用中", SUSPENDED: "運用停止", RETIRED: "廃棄済み" };
function date(form: FormData, key: string) {
  const value = field(form, key, 10, false);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value || value < "0001-01-01") throw new InputError("日付を確認してください。");
  return new Date(value);
}
export function parseMedicalDevice(form: FormData) {
  const id = field(form, "id", 36, false), departmentId = field(form, "departmentId", 36, false);
  const status = field(form, "status");
  if (!Object.hasOwn(statuses, status)) throw new InputError("状態を確認してください。");
  return { id: id ? identifier(id) : undefined, managementNumber: field(form,"managementNumber",80),
    assetNumber: field(form,"assetNumber",80,false) || null, name: field(form,"name"), category: field(form,"category",80),
    manufacturer: field(form,"manufacturer",120,false) || null, modelName: field(form,"modelName",120,false) || null,
    serialNumber: field(form,"serialNumber",120,false) || null, departmentId: departmentId ? identifier(departmentId) : null,
    location: field(form,"location",120,false) || null, purchaseDate: date(form,"purchaseDate"), warrantyUntil: date(form,"warrantyUntil"),
    status: status as MedicalDeviceStatus, notes: field(form,"notes",2000,false) || null };
}
export function listQuery(input: Record<string,string|string[]|undefined>) {
  const value = (key: string) => typeof input[key] === "string" ? input[key] as string : "";
  const status = value("status");
  return { availability:Object.hasOwn(availabilityLabels,value("availability")) ? value("availability") as Availability : undefined, q: value("q").trim().slice(0,120), status: Object.hasOwn(statuses,status) ? status as MedicalDeviceStatus : undefined,
    page: /^\d{1,6}$/.test(value("page")) ? Math.max(1,Number(value("page"))) : 1, size: 10 };
}
