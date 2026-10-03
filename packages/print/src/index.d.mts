export type PrintDocument = { title: string; subtitle?: string;
  fields?: readonly {label: string; value: string | null}[];
  tables?: readonly {title: string; columns: readonly string[]; rows: readonly (readonly string[])[]}[];
  footer?: string };
export const PRINT_HEADERS: Readonly<Record<string,string>>;
export const PRINT_SCRIPT: string;
export function renderPrintDocument(document: PrintDocument, options?: {scriptPath?: string}): string;
