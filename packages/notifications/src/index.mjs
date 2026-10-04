function text(value, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max || value.includes("\0")) throw new TypeError("通知の項目を確認してください。");
  return value;
}
function destination(href) {
  text(href, 2048);
  if (!href.startsWith("/") || href.startsWith("//") || /[\\\u0000-\u001f\u007f]/u.test(href)) throw new TypeError("通知のリンクが不正です。");
  const url = new URL(href, "https://kumuno.invalid");
  if (url.origin !== "https://kumuno.invalid" || !(url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/"))) throw new TypeError("通知のリンクが不正です。");
  return href;
}
// Caller authorizes the operation and binds write to its business transaction.
export async function publishNotification(write, actor, recipient, event) {
  if (actor?.isActive !== true || recipient?.isActive !== true || actor.organizationId !== recipient.organizationId) throw new TypeError("通知の組織と有効状態を確認してください。");
  text(actor.id,120);
  const entry = {
    organizationId: text(actor.organizationId,120), recipientId: text(recipient.id,120),
    key: text(event?.key,200), title: text(event?.title,160), message: text(event?.message,1000), href: destination(event?.href),
  };
  return await write(entry);
}
