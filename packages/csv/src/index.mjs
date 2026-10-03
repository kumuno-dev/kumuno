const ceilings = Object.freeze({ maxBytes: 2097152, maxRows: 10001, maxColumns: 64, maxCellLength: 10000 });
export class CsvError extends Error {
  constructor(code, row = 1, column = 1) {
    super("CSVの形式または上限を確認してください。");
    this.name = "CsvError"; this.code = code; this.row = row; this.column = column;
  }
}
function limits(options) {
  const result = { ...ceilings };
  for (const key of Object.keys(ceilings)) {
    if (options[key] === undefined) continue;
    if (!Number.isSafeInteger(options[key]) || options[key] < 1 || options[key] > ceilings[key]) throw new TypeError("CSVの上限が不正です。");
    result[key] = options[key];
  }
  return result;
}
export function parseCsv(input, options = {}) {
  if (typeof input !== "string") throw new TypeError("CSVは文字列で指定してください。");
  const limit = limits(options);
  if (input.length > limit.maxBytes || new TextEncoder().encode(input).length > limit.maxBytes) throw new CsvError("MAX_BYTES");
  const text = input.startsWith("\uFEFF") ? input.slice(1) : input;
  const rows = []; let row = [], cell = "", quoted = false, closed = false;
  const fail = code => { throw new CsvError(code, rows.length + 1, row.length + 1); };
  const append = character => {
    if (character === "\0") fail("INVALID_CHARACTER");
    cell += character;
    if (cell.length > limit.maxCellLength) fail("MAX_CELL_LENGTH");
  };
  const field = () => {
    if (row.length >= limit.maxColumns) fail("MAX_COLUMNS");
    row.push(cell); cell = ""; closed = false;
  };
  const record = () => {
    field();
    if (rows.length >= limit.maxRows) fail("MAX_ROWS");
    if (rows.length && row.length !== rows[0].length) fail("COLUMN_COUNT");
    rows.push(row); row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (quoted) {
      if (character === '"') {
        if (text[i + 1] === '"') { append('"'); i++; }
        else { quoted = false; closed = true; }
      } else append(character);
      continue;
    }
    if (character === ",") { field(); continue; }
    if (character === "\n" || character === "\r") {
      if (character === "\r") {
        if (text[i + 1] !== "\n") fail("INVALID_LINE_ENDING");
        i++;
      }
      record(); continue;
    }
    if (closed) fail("AFTER_QUOTE");
    if (character === '"') {
      if (cell.length) fail("UNEXPECTED_QUOTE");
      quoted = true;
    } else append(character);
  }
  if (quoted) fail("UNCLOSED_QUOTE");
  if (row.length || cell.length || closed || text.endsWith(",")) record();
  return rows;
}
function encodeCell(value, row, column, limit) {
  if (value === null) value = "";
  if (typeof value !== "string") throw new TypeError("CSVの値は文字列またはnullで指定してください。");
  if (value.length > limit.maxCellLength) throw new CsvError("MAX_CELL_LENGTH", row, column);
  if (value.includes("\0")) throw new CsvError("INVALID_CHARACTER", row, column);
  // Refuse ambiguous spreadsheet formulas rather than changing business values.
  if (/^[\t\r\n]/u.test(value) || /^[\s\u0000-\u001f\u007f]*[=+\-@＝＋－＠]/u.test(value)) throw new CsvError("FORMULA_PREFIX", row, column);
  return `"${value.replaceAll('"', '""')}"`;
}
export function stringifyCsv({ headers, rows }, options = {}) {
  const limit = limits(options);
  if (!Array.isArray(headers) || !headers.length || headers.length > limit.maxColumns) throw new CsvError("MAX_COLUMNS");
  if (!Array.isArray(rows) || rows.length + 1 > limit.maxRows) throw new CsvError("MAX_ROWS");
  const records = []; let bytes = options.bom === false ? 0 : 3;
  for (const [index, row] of [headers, ...rows].entries()) {
    if (!Array.isArray(row) || row.length !== headers.length) throw new CsvError("COLUMN_COUNT", index + 1);
    const record = Array.from(row, (value, column) => encodeCell(value, index + 1, column + 1, limit)).join(",") + "\r\n";
    bytes += new TextEncoder().encode(record).length;
    if (bytes > limit.maxBytes) throw new CsvError("MAX_BYTES", index + 1);
    records.push(record);
  }
  const csv = (options.bom === false ? "" : "\uFEFF") + records.join("");
  return csv;
}
