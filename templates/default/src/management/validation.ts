export class InputError extends Error {}
export function field(form: FormData, name: string, max = 120, required = true) {
  const value = form.get(name);
  if (typeof value !== "string") throw new InputError("入力内容を確認してください。");
  const result = value.trim();
  if ((required && !result) || result.length > max) throw new InputError("必須項目と文字数を確認してください。");
  return result;
}
export function identifier(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new InputError("対象の指定が不正です。");
  return value;
}
export function parseDepartment(form: FormData) {
  const id = field(form, "id", 36, false);
  const parent = field(form, "parentId", 36, false);
  return { id: id ? identifier(id) : undefined, code: field(form, "code", 40), name: field(form, "name"), parentId: parent ? identifier(parent) : null };
}
export function parseUser(form: FormData) {
  const id = field(form, "id", 36, false);
  const department = field(form, "departmentId", 36, false);
  const email = field(form, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError("メールアドレスを確認してください。");
  const role = field(form, "role");
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "USER") throw new InputError("ロールが不正です。");
  const status = field(form, "isActive");
  if (status !== "true" && status !== "false") throw new InputError("状態が不正です。");
  let password: string | undefined;
  if (!id) {
    const value = form.get("password");
    if (typeof value !== "string" || value.length < 12 || value.length > 128) throw new InputError("初期パスワードは12〜128文字にしてください。");
    password = value;
  }
  return { id: id ? identifier(id) : undefined, name: field(form, "name"), email,
    employeeCode: field(form, "employeeCode", 40, false) || null,
    departmentId: department ? identifier(department) : null, role: role as "ADMIN" | "MANAGER" | "USER", isActive: status === "true", password };
}
