import { DatabaseConfigurationError } from "./config";

// Database errors may contain connection credentials or SQL data. Log codes only.
export function databaseErrorCode(error: unknown): string {
  let current = error;
  for (let depth = 0; depth < 5; depth++) {
    if (typeof current !== "object" || current === null) break;
    if ("code" in current && typeof current.code === "string" && /^[A-Z0-9_]{2,32}$/.test(current.code)) {
      return current.code;
    }
    if (!("cause" in current)) break;
    current = current.cause;
  }
  return "UNKNOWN";
}

export function databaseErrorMessage(error: unknown) {
  if (error instanceof DatabaseConfigurationError) return error.message;
  return `DB操作に失敗しました。接続設定・DBの稼働状態・権限を確認してください。（code: ${databaseErrorCode(error)}）`;
}
