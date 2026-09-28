import { randomUUID, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { chromium, expect } from "@playwright/test";
import { parseDatabaseUrl, getDatabaseConfig } from "../src/database/config";
import { createDatabaseConnection } from "../src/database/connection";
import { migrateDatabase } from "../src/database/migrate";
import { seedDevelopment } from "../src/database/seed";
import { disableUser } from "../src/authentication/session";

let stage = "configuration";
async function main() {
  const testUrl = new URL(parseDatabaseUrl(process.env.TEST_DATABASE_URL, "TEST_DATABASE_URL"));
  if (!testUrl.pathname.endsWith("_test")) throw new Error("専用_test DBが必要です。");
  const schema = `kumuno_auth_${randomUUID().replaceAll("-", "")}`;
  testUrl.searchParams.set("schema", schema);
  const connection = createDatabaseConnection(getDatabaseConfig({ DATABASE_URL: testUrl.toString() }));
  let created = false;
  let child: ReturnType<typeof spawn> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await connection.pool.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await migrateDatabase(testUrl.toString());
    const password = randomBytes(24).toString("hex");
    const fixture = await seedDevelopment(connection.db, { NODE_ENV: "test", SEED_ALLOW_DEVELOPMENT: "true", SEED_ADMIN_PASSWORD: password });
    const probe = createServer();
    probe.listen(0, "127.0.0.1"); await once(probe, "listening");
    const address = probe.address();
    if (!address || typeof address === "string") throw new Error("Port unavailable");
    const port = address.port;
    await new Promise<void>((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
    const baseURL = `http://127.0.0.1:${port}`;
    const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: testUrl.toString(), BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: randomBytes(32).toString("hex"), NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
    delete env.AUTH_TRUSTED_IP_HEADER;
    const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env, stdio: "inherit" });
    if (build.status !== 0) throw new Error("Build failed");
    stage = "server startup";
    child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: "ignore" });
    let startupError = false;
    child.on("error", () => { startupError = true; });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (startupError || child.exitCode !== null) throw new Error("Server failed");
      try { ready = (await fetch(`${baseURL}/login`)).ok; } catch { /* Startup in progress. */ }
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error("Server timeout");
    stage = "browser launch";
    browser = await chromium.launch();
    for (const width of [1280, 390]) {
      await connection.db.rateLimit.deleteMany();
      await connection.db.user.update({ where: { id: fixture.userId }, data: { isActive: true } });
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      page.on("response", response => { if (response.url().includes("/api/auth/")) console.log(`Auth HTTP status: ${response.status()}`); });
      page.on("pageerror", () => console.error("Browser runtime error"));
      stage = "protected route";
      await page.goto(`${baseURL}/dashboard`);
      await expect(page).toHaveURL(`${baseURL}/login`);
      await page.getByLabel("メールアドレス").fill("admin@example.com");
      await page.getByLabel("パスワード", { exact: true }).fill("incorrect-password");
      await page.getByRole("button", { name: "ログイン", exact: true }).click();
      stage = "wrong password";
      await expect(page.locator("form").getByRole("alert")).toBeVisible();
      await expect(page.locator("form").getByRole("alert")).toContainText("確認してください");
      await page.getByLabel("パスワード", { exact: true }).fill(password);
      await page.getByRole("button", { name: "ログイン", exact: true }).click();
      stage = "successful login";
      await expect(page).toHaveURL(`${baseURL}/dashboard`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText("開発用管理者");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      stage = "logout";
      await page.getByRole("button", { name: "ログアウト", exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/login`);
      stage = "protected route";
      await page.goto(`${baseURL}/dashboard`);
      await expect(page).toHaveURL(`${baseURL}/login`);
      await page.getByLabel("メールアドレス").fill("admin@example.com");
      await page.getByLabel("パスワード", { exact: true }).fill(password);
      await page.getByRole("button", { name: "ログイン", exact: true }).click();
      stage = "successful login";
      await expect(page).toHaveURL(`${baseURL}/dashboard`);
      stage = "disabled session";
      await disableUser(connection.db, fixture.userId, fixture.userId);
      await page.reload();
      await expect(page).toHaveURL(`${baseURL}/login`);
      await context.close();
    }
    console.log("Authentication browser checks passed: desktop/mobile, protected route, wrong password, login, logout, disabled session.");
  } finally {
    try { await browser?.close(); }
    finally {
      if (child && child.exitCode === null && child.pid) {
        const stopped = once(child, "exit"); child.kill("SIGTERM"); await stopped;
      }
      try { if (created) await connection.pool.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await connection.close(); }
    }
  }
}
main().catch(() => {
  console.error(`認証ブラウザー検証に失敗しました。確認箇所: ${stage}`);
  process.exitCode = 1;
});
