export function validateAuditEvent(event) {
  if (!event || !["CREATE", "UPDATE", "DELETE"].includes(event.action)) {
    throw new TypeError("監査操作が不正です。");
  }
  const before = event.before !== undefined;
  const after = event.after !== undefined;
  if ((event.action === "CREATE" && (before || !after)) ||
      (event.action === "UPDATE" && (!before || !after)) ||
      (event.action === "DELETE" && (!before || after))) {
    throw new TypeError("監査ログの変更前後が操作と一致しません。");
  }
}
function identifier(value) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError("監査対象または操作者が不正です。");
  return value;
}
// Only explicitly projected JSON is accepted: never serialize model objects via toJSON.
function copyJson(value, ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || ancestors.has(value) ||
      (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))) {
    throw new TypeError("監査スナップショットにはJSON値を指定してください。");
  }
  ancestors.add(value);
  try {
    return Array.isArray(value) ? Array.from(value, item => copyJson(item, ancestors)) :
      Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyJson(item, ancestors)]));
  } finally { ancestors.delete(value); }
}
function snapshot(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("監査スナップショットにはオブジェクトを指定してください。");
  }
  return copyJson(value);
}
// The caller must bind write to the same transaction as the business update.
export async function appendAuditLog(write, actor, event) {
  validateAuditEvent(event);
  const entry = {
    organizationId: identifier(actor?.organizationId), userId: identifier(actor?.id),
    action: event.action, resourceType: identifier(event.resourceType), resourceId: identifier(event.resourceId),
    metadata: { version: 1 }, before: snapshot(event.before), after: snapshot(event.after),
  };
  return await write(entry);
}
