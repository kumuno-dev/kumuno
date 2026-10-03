export const PRINT_HEADERS = Object.freeze({
  "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "Vary": "Cookie",
  "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
});
export const PRINT_SCRIPT = `document.querySelector('[data-kumuno-print]')?.addEventListener('click', () => window.print());`;
const css = `*{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#171717;font-family:system-ui,sans-serif;font-size:10pt;line-height:1.6}
.toolbar{max-width:210mm;margin:16px auto;padding:0 16px}button{font:inherit;padding:8px 16px;cursor:pointer}button:focus-visible{outline:3px solid #b45309;outline-offset:3px}
article{width:calc(100% - 32px);max-width:210mm;margin:16px auto;padding:24px;background:white;border:1px solid #d4d4d4}h1{font-size:20pt;line-height:1.3;margin:0 0 8px}h2{font-size:13pt;margin:24px 0 8px;break-after:avoid}p,dd{white-space:pre-wrap;overflow-wrap:anywhere}p{margin:8px 0}.subtitle{color:#525252}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:16px 24px}.field{break-inside:avoid}dt{font-size:9pt;color:#525252}dd{margin:4px 0 0;font-weight:600}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #a3a3a3;padding:6px;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}th{background:#f5f5f5}thead{display:table-header-group}tr{break-inside:avoid}footer{margin-top:24px;border-top:1px solid #a3a3a3;padding-top:8px;font-size:9pt;white-space:pre-wrap;overflow-wrap:anywhere}
@media(max-width:480px){.fields{grid-template-columns:1fr}article{padding:16px}h1{font-size:17pt}}
@page{size:A4 portrait;margin:16mm}
@media print{body{background:white}article{width:auto;max-width:none;margin:0;padding:0;border:0}.toolbar{display:none}.fields{grid-template-columns:1fr 1fr}h1{font-size:20pt}}`;
function escape(value) {
  if(typeof value !== "string") throw new TypeError("帳票の文字列が不正です。");
  return value.replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
}
export function renderPrintDocument({title, subtitle="", fields=[], tables=[], footer=""}, {scriptPath="/print-client.js"}={}) {
  if(typeof title !== "string" || !title.trim()) throw new TypeError("帳票タイトルが必要です。");
  if(typeof scriptPath !== "string" || !/^\/[A-Za-z0-9/_.-]+$/.test(scriptPath) || scriptPath.startsWith("//") || scriptPath.includes("..")) throw new TypeError("印刷スクリプトのパスが不正です。");
  const items=fields.map(field=>`<div class="field"><dt>${escape(field.label)}</dt><dd>${escape(field.value ?? "未設定")}</dd></div>`).join("");
  const sections=tables.map(table=>{
    if(!table.columns.length || table.rows.some(row=>row.length!==table.columns.length)) throw new TypeError("帳票の表の列数が一致しません。");
    return `<section><h2>${escape(table.title)}</h2><table><thead><tr>${table.columns.map(column=>`<th scope="col">${escape(column)}</th>`).join("")}</tr></thead><tbody>${table.rows.map(row=>`<tr>${row.map(cell=>`<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`;
  }).join("");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>${css}</style><script src="${escape(scriptPath)}" defer></script></head><body><div class="toolbar"><button type="button" data-kumuno-print>印刷 / PDF保存</button><p>印刷画面で用紙をA4に設定してください。PDFに保存する場合は送信先をPDF保存にします。</p></div><article><header><h1>${escape(title)}</h1><p class="subtitle">${escape(subtitle)}</p></header><dl class="fields">${items}</dl>${sections}${footer ? `<footer>${escape(footer)}</footer>` : ""}</article></body></html>`;
}
