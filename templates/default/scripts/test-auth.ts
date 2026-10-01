import { randomUUID, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
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
    for (const width of [1280, 768, 390]) {
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
      stage = "equipment CRUD";
      await page.getByRole("navigation", { name: "業務メニュー" }).getByRole("link", { name: "備品", exact: true }).click();
      await page.getByRole("link", { name: "備品を登録", exact: true }).click();
      await page.getByLabel("備品名", { exact: true }).fill(`検証備品${width}`);
      await page.getByLabel("カテゴリ", { exact: true }).fill("端末");
      await page.getByLabel("購入日", { exact: true }).fill("2026-10-01");
      await page.getByLabel("購入価格（円）", { exact: true }).fill("123456.78");
      await page.getByLabel("部署").selectOption({ label: "総務部" });
      await page.getByLabel("担当者").selectOption({ label: "開発用管理者" });
      await page.getByLabel("備考", { exact: true }).fill("<script>not executed</script>");
      await page.getByRole("button", { name: "保存する", exact: true }).click();
      await expect(page.getByRole("heading", { name: `検証備品${width}`, exact: true })).toBeVisible();
      const deletedURL = page.url();
      await page.getByText("備品を編集", { exact: true }).click();
      await page.getByLabel("備品名", { exact: true }).fill(`更新備品${width}`);
      await page.getByLabel("状態").selectOption("REPAIR");
      await page.getByRole("button", { name: "保存する", exact: true }).click();
      await expect(page.getByRole("heading", { name: `更新備品${width}`, exact: true })).toBeVisible();
      await page.getByText("備品を削除", { exact: true }).click();
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "削除する", exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/dashboard/equipment`);
      await page.goto(deletedURL);
      await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
      stage = "equipment search pagination sort";
      await connection.db.equipment.createMany({ data: Array.from({ length: 12 }, (_,i) => ({ organizationId: fixture.organizationId, name: `E2E-${width}-${String(i).padStart(2,"0")}`, category: "ブラウザー検証", purchasePrice: String(i) })) });
      await page.goto(`${baseURL}/dashboard/equipment`);
      await page.getByLabel("検索", { exact: true }).fill(`E2E-${width}`);
      await page.getByRole("button", { name: "検索する", exact: true }).click();
      await expect(page.locator("article.record")).toHaveCount(10);
      await page.getByRole("link", { name: "次のページ", exact: true }).click();
      await expect(page.locator("article.record")).toHaveCount(2);
      await page.getByLabel("並び順").selectOption("price");
      await page.getByRole("button", { name: "検索する", exact: true }).click();
      await expect(page.locator("article.record").first()).toContainText(`E2E-${width}-11`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (process.env.TEST_SCREENSHOT_DIR) {
        await mkdir(process.env.TEST_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: join(process.env.TEST_SCREENSHOT_DIR, `equipment-${width}.png`), fullPage: true });
      }
      stage = "medical ledger create edit search duplicate";
      await page.goto(`${baseURL}/dashboard/medical-equipment/new`);
      await page.getByLabel("機器管理番号（必須）",{exact:true}).fill(`ME-E2E-${width}`);
      await page.getByLabel("機器名（必須）",{exact:true}).fill(`試用輸液ポンプ${width}`);
      await page.getByLabel("種別（必須）",{exact:true}).fill("輸液ポンプ");
      await page.getByLabel("メーカー",{exact:true}).fill("サンプルメーカー");
      await page.getByLabel("型式",{exact:true}).fill("DEMO-01");
      await page.getByLabel("所属部署",{exact:true}).selectOption({label:"総務部"});
      await page.getByLabel("設置場所",{exact:true}).fill("機器管理室");
      await page.getByLabel("保証期限",{exact:true}).fill("2027-10-01");
      await page.getByRole("button",{name:"保存する",exact:true}).click();
      await expect(page.getByRole("heading",{name:`試用輸液ポンプ${width}`,exact:true})).toBeVisible();
      const medicalURL = page.url();
      await page.getByText("医療機器を編集",{exact:true}).click();
      await page.getByLabel("台帳上の状態",{exact:true}).selectOption("SUSPENDED");
      await page.getByRole("button",{name:"保存する",exact:true}).click();
      await expect(page.locator(".page-description")).toContainText("運用停止");
      await page.goto(`${baseURL}/dashboard/medical-equipment/new`);
      await page.getByLabel("機器管理番号（必須）",{exact:true}).fill(`ME-E2E-${width}`);
      await page.getByLabel("機器名（必須）",{exact:true}).fill("重複登録");
      await page.getByLabel("種別（必須）",{exact:true}).fill("輸液ポンプ");
      await page.getByRole("button",{name:"保存する",exact:true}).click();
      stage = "medical duplicate rejection";
      await expect(page.locator("form").getByRole("alert")).toContainText("登録済み");
      await page.goto(`${baseURL}/dashboard/medical-equipment`);
      await page.getByLabel("検索",{exact:true}).fill(`ME-E2E-${width}`);
      await page.getByLabel("台帳上の状態",{exact:true}).selectOption("SUSPENDED");
      await page.getByRole("button",{name:"検索する",exact:true}).click();
      await expect(page.locator("article.record")).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (process.env.TEST_SCREENSHOT_DIR) await page.screenshot({path:join(process.env.TEST_SCREENSHOT_DIR,`medical-equipment-${width}.png`),fullPage:true});
      await page.goto(medicalURL);
      await page.getByText("医療機器を編集",{exact:true}).click();
      await page.getByLabel("機器名（必須）",{exact:true}).fill("権限変更後の更新");
      await connection.db.user.update({where:{id:fixture.userId},data:{role:"USER"}});
      await page.getByRole("button",{name:"保存する",exact:true}).click();
      stage = "medical stale permission denial";
      await expect(page.locator("form").getByRole("alert")).toContainText("権限がありません");
      await page.goto(medicalURL);
      await expect(page.getByRole("heading",{name:`試用輸液ポンプ${width}`,exact:true})).toBeVisible();
      await expect(page.getByText("医療機器を編集",{exact:true})).toHaveCount(0);
      await page.goto(`${baseURL}/dashboard/medical-equipment/new`);
      await expect(page.getByRole("heading",{name:"アクセスできません"})).toBeVisible();
      await connection.db.user.update({where:{id:fixture.userId},data:{role:"ADMIN"}});
      await page.goto(`${baseURL}/dashboard`);
      stage = "management CRUD";
      await page.getByRole("navigation", { name: "業務メニュー" }).getByRole("link", { name: "部署", exact: true }).click();
      await page.getByText("部署を登録", { exact: true }).click();
      const createDepartment = page.locator("details.create-panel");
      await createDepartment.getByLabel("部署コード", { exact: true }).fill(`browser-${width}`);
      await createDepartment.getByLabel("部署名", { exact: true }).fill(`検証部署${width}`);
      stage = "department create";
      await createDepartment.getByRole("button", { name: "登録する" }).click();
      await expect(page.getByRole("heading", { name: `検証部署${width}`, exact: true })).toBeVisible();
      const departmentRecord = page.locator("article").filter({ has: page.getByRole("heading", { name: `検証部署${width}`, exact: true }) });
      await departmentRecord.getByText(`検証部署${width}を編集`, { exact: true }).click();
      await departmentRecord.getByLabel("部署名", { exact: true }).fill(`更新部署${width}`);
      stage = "department edit";
      await departmentRecord.getByRole("button", { name: "保存する", exact: true }).click();
      await expect(page.getByRole("heading", { name: `更新部署${width}`, exact: true })).toBeVisible();
      await page.getByRole("navigation").getByRole("link", { name: "ユーザー", exact: true }).click();
      await page.getByText("ユーザーを登録", { exact: true }).click();
      const createUser = page.locator("details.create-panel");
      await createUser.getByLabel("氏名", { exact: true }).fill(`検証ユーザー${width}`);
      await createUser.getByLabel("メールアドレス", { exact: true }).fill(`browser-${width}@example.com`);
      await createUser.getByLabel("初期パスワード", { exact: true }).fill(password);
      await createUser.getByLabel("所属部署").selectOption({ label: `更新部署${width}` });
      stage = "user create";
      await createUser.getByRole("button", { name: "登録する" }).click();
      const userRecord = page.locator("article").filter({ has: page.getByRole("heading", { name: `検証ユーザー${width}`, exact: true }) });
      await expect(userRecord).toBeVisible();
      await userRecord.getByText(`検証ユーザー${width}を編集`, { exact: true }).click();
      stage = "user disable";
      await userRecord.getByLabel("利用状態").selectOption("false");
      await userRecord.getByRole("button", { name: "保存する", exact: true }).click();
      await expect(userRecord.locator(".badge")).toHaveText("無効");
      stage = "user reactivate";
      await userRecord.getByLabel("利用状態").selectOption("true");
      await userRecord.getByLabel("所属部署").selectOption("");
      await userRecord.getByRole("button", { name: "保存する", exact: true }).click();
      await expect(userRecord.locator(".badge")).toHaveText("有効");
      await page.getByRole("navigation").getByRole("link", { name: "部署", exact: true }).click();
      const updatedDepartment = page.locator("article").filter({ has: page.getByRole("heading", { name: `更新部署${width}`, exact: true }) });
      await updatedDepartment.getByText(`更新部署${width}を編集`, { exact: true }).click();
      await updatedDepartment.getByRole("checkbox").check();
      stage = "department delete";
      await updatedDepartment.getByRole("button", { name: "部署を削除", exact: true }).click();
      await expect(updatedDepartment).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (process.env.TEST_SCREENSHOT_DIR) {
        await mkdir(process.env.TEST_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: join(process.env.TEST_SCREENSHOT_DIR, `departments-${width}.png`), fullPage: true });
      }
      stage = "stale admin form denial";
      const staleCreate = page.locator("details.create-panel");
      await staleCreate.evaluate(element => { (element as HTMLDetailsElement).open = true; });
      await staleCreate.getByLabel("部署コード", { exact: true }).fill(`denied-${width}`);
      await staleCreate.getByLabel("部署名", { exact: true }).fill("拒否される部署");
      await connection.db.user.update({ where: { id: fixture.userId }, data: { role: "MANAGER" } });
      await staleCreate.getByRole("button", { name: "登録する", exact: true }).click();
      await expect(staleCreate.getByRole("alert")).toContainText("権限がありません");
      stage = "read-only roles";
      await page.goto(`${baseURL}/dashboard/users`);
      await expect(page.getByRole("heading", { name: "ユーザー", exact: true })).toBeVisible();
      await expect(page.getByText("ユーザーを登録", { exact: true })).toHaveCount(0);
      await expect(page.locator("form")).toHaveCount(0);
      await connection.db.user.update({ where: { id: fixture.userId }, data: { role: "USER" } });
      await page.goto(`${baseURL}/dashboard/users`);
      await expect(page.getByRole("heading", { name: "アクセスできません" })).toBeVisible();
      await expect(page.getByText(`browser-${width}@example.com`, { exact: true })).toHaveCount(0);
      await page.goto(`${baseURL}/dashboard/equipment`);
      await expect(page.getByRole("heading", { name: "備品", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "備品を登録", exact: true })).toHaveCount(0);
      await page.goto(`${baseURL}/dashboard/equipment/new`);
      await expect(page.getByRole("heading", { name: "アクセスできません" })).toBeVisible();
      await connection.db.user.update({ where: { id: fixture.userId }, data: { role: "ADMIN" } });
      await page.goto(`${baseURL}/dashboard`);
      if (process.env.TEST_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.TEST_SCREENSHOT_DIR, `dashboard-${width}.png`), fullPage: true });
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
    console.log("Authentication and management browser checks passed: desktop/tablet/mobile, CRUD, role restrictions, stale-form denial, login, logout, disabled session.");
  } catch (error) {
    const page = browser?.contexts()[0]?.pages()[0];
    if (page && process.env.TEST_SCREENSHOT_DIR) {
      await mkdir(process.env.TEST_SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: join(process.env.TEST_SCREENSHOT_DIR, "failure.png"), fullPage: true, mask: [page.locator('input[type="password"]')] });
    }
    throw error;
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
