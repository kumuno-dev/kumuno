import { describe, expect, it } from "vitest";
import { getDatabaseConfig, parseDatabaseUrl } from "./config";
import { databaseErrorMessage } from "./errors";

describe("database configuration", () => {
  it.each([undefined, "", "   ", "not-a-url", "https://db.example/a", "postgresql://localhost/", "postgresql://user@localhost/db#secret"])(
    "不正・不足設定を接続前に拒否する: %s",
    (url) => expect(() => parseDatabaseUrl(url)).toThrow(),
  );

  it("TLS指定を含むPostgreSQL URLを維持し、接続数とタイムアウトを制限する", () => {
    const url = "postgresql://user:secret@db.example:5432/app?sslmode=verify-full";
    const config = getDatabaseConfig({ DATABASE_URL: url });
    expect(config.connectionString).toBe(url);
    expect(config.max).toBeGreaterThan(0);
    expect(config.connectionTimeoutMillis).toBeGreaterThan(0);
    expect(config.statement_timeout).toBeGreaterThan(0);
  });

  it("設定エラーに入力された秘密情報を含めない", () => {
    try {
      parseDatabaseUrl("postgresql://user:very-secret@[invalid/app");
      expect.unreachable();
    } catch (error) {
      expect(databaseErrorMessage(error)).not.toContain("very-secret");
      expect(databaseErrorMessage(error)).toContain("DATABASE_URL");
    }
  });

  it("SQLや接続情報を出さず、ラップされたDBエラーのコードを残す", () => {
    const message = databaseErrorMessage({
      message: "password=private; SQL confidential",
      cause: { code: "28P01", message: "credentials secret" },
    });
    expect(message).toContain("28P01");
    expect(message).not.toMatch(/private|confidential|secret/);
  });
});
