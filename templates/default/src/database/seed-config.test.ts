import { expect, test } from "vitest";
import { getSeedConfig } from "./seed-config";

test("開発用明示設定とパスワードが必須", () => {
  expect(() => getSeedConfig({})).toThrow();
  expect(() => getSeedConfig({ SEED_ALLOW_DEVELOPMENT: "true", SEED_ADMIN_PASSWORD: "short" })).toThrow();
  expect(() => getSeedConfig({ NODE_ENV: "production", SEED_ALLOW_DEVELOPMENT: "true", SEED_ADMIN_PASSWORD: "a".repeat(16) })).toThrow();
  expect(getSeedConfig({ SEED_ALLOW_DEVELOPMENT: "true", SEED_ADMIN_PASSWORD: "a".repeat(16) }).password).toHaveLength(16);
});
