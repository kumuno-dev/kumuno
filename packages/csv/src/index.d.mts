export type CsvLimits = { maxBytes?: number; maxRows?: number; maxColumns?: number; maxCellLength?: number };
export class CsvError extends Error { readonly code: string; readonly row: number; readonly column: number; constructor(code: string, row?: number, column?: number); }
export function parseCsv(input: string, options?: CsvLimits): string[][];
export function stringifyCsv(document: { headers: readonly string[]; rows: readonly (readonly (string | null)[])[] }, options?: CsvLimits & { bom?: boolean }): string;
