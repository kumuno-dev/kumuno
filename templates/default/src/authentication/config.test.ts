import { expect, test } from "vitest";
import { getAuthConfig } from "./config";
const settings = { BETTER_AUTH_SECRET: "a".repeat(40), BETTER_AUTH_URL: "http://localhost:3000" };
test("秘密鍵と固定originが必須", () => {
  expect(() => getAuthConfig({})).toThrow();
  expect(() => getAuthConfig({ ...settings, BETTER_AUTH_SECRET: "short" })).toThrow();
  for (const url of ["http://example.com", "https://example.com/path", "https://user:pass@example.com", "https://example.com?x=1"]) {
    expect(() => getAuthConfig({ ...settings, BETTER_AUTH_URL: url })).toThrow();
  }
  expect(getAuthConfig(settings).secureCookies).toBe(false);
  expect(getAuthConfig({ ...settings, BETTER_AUTH_URL: "https://example.com" }).secureCookies).toBe(true);
});
