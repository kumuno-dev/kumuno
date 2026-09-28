import { can } from "../../src/authorization/policy";
import { createAuthentication } from "../../src/authentication/factory";
import { getAuthConfig } from "../../src/authentication/config";
import { handleAuthentication } from "../../src/authentication/handler";
import { getActiveUser, disableUser } from "../../src/authentication/session";
import { seedDevelopment } from "../../src/database/seed";
import { verifyPassword } from "better-auth/crypto";
import { moveDepartment } from "../../src/organization/department";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { getDatabaseConfig, parseDatabaseUrl } from "../../src/database/config";
import { createDatabaseConnection } from "../../src/database/connection";
import { migrateDatabase, runMigrationCommand } from "../../src/database/migrate";
import { databaseErrorCode, databaseErrorMessage } from "../../src/database/errors";

const testUrl = parseDatabaseUrl(process.env.TEST_DATABASE_URL, "TEST_DATABASE_URL");
if (!new URL(testUrl).pathname.endsWith("_test")) throw new Error("TEST_DATABASE_URLのDB名は_testで終わる専用DBにしてください。");
let connection: ReturnType<typeof createDatabaseConnection>;
let schema: string;
let url: string;
let folder: string;
let configPath: string;
let created = false;

beforeEach(async () => {
  schema = `kumuno_test_${randomUUID().replaceAll("-", "")}`;
  created = false;
  const target = new URL(testUrl);
  target.searchParams.set("schema", schema);
  url = target.toString();
  connection = createDatabaseConnection({ ...getDatabaseConfig({ DATABASE_URL: url }), ...{ options: `-c search_path=${schema}` } });
  folder = await mkdtemp(join(tmpdir(), "kumuno-prisma-"));
  configPath = join(folder, "prisma.config.ts");
  await writeFile(configPath, `export default { schema: ${JSON.stringify(resolve("prisma/schema.prisma"))}, migrations: { path: ${JSON.stringify(join(folder,"migrations"))} }, datasource: { url: process.env.DATABASE_URL } };`);
  // Identifier is generated exclusively from a UUID, never user input.
  await connection.pool.query(`CREATE SCHEMA "${schema}"`);
  created = true;
});
afterEach(async () => {
  try { if (created) await connection.pool.query(`DROP SCHEMA "${schema}" CASCADE`); }
  finally {
    try { await connection.close(); }
    finally { if (folder) await rm(folder, { recursive: true, force: true }); }
  }
});
async function fixtures(statements: string[]) {
  await mkdir(join(folder, "migrations"), { recursive: true });
  await writeFile(join(folder, "migrations/migration_lock.toml"), 'provider = "postgresql"\n');
  for (const [i, sql] of statements.entries()) {
    const directory = join(folder, "migrations", `2026092700000${i}_test`);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "migration.sql"), `BEGIN;\n${sql}\nCOMMIT;`);
  }
}
const migrate = () => migrateDatabase(url, configPath);
async function historyCount() {
  const result = await connection.pool.query(`SELECT count(*) FROM "${schema}"._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`);
  return Number(result.rows[0].count);
}
test("Prismaで入力をSQLではなく値として渡す", async () => {
  const input = "'; DROP TABLE users; --";
  const result = await connection.db.$queryRaw<{ value: string }[]>`SELECT ${input}::text AS value`;
  expect(result[0].value).toBe(input);
});
test("接続失敗時に秘密情報を出さない", async () => {
  const missing = new URL(testUrl);
  missing.pathname = `/kumuno_missing_${randomUUID().replaceAll("-", "")}`;
  const invalid = createDatabaseConnection(getDatabaseConfig({ DATABASE_URL: missing.toString() }));
  try {
    const error = await invalid.db.$queryRaw`SELECT 1`.then(() => undefined, (error: unknown) => error);
    expect(error).toBeDefined();
    expect(databaseErrorCode(error)).not.toBe("UNKNOWN");
    expect(databaseErrorMessage(error)).not.toContain(missing.password);
  } finally { await invalid.close(); }
});
test("リポジトリのMigrationを初回適用し、再実行しても履歴が増えない", async () => {
  await migrateDatabase(url);
  expect(await historyCount()).toBe(4);
  await migrateDatabase(url);
  expect(await historyCount()).toBe(4);
});
test("後続Migrationが既存データを保持する", async () => {
  const initial = 'CREATE TABLE probe (id integer PRIMARY KEY); INSERT INTO probe VALUES (1);';
  await fixtures([initial]); await migrate();
  await fixtures([initial, "ALTER TABLE probe ADD COLUMN label text NOT NULL DEFAULT 'retained';"]); await migrate();
  expect((await connection.pool.query('SELECT * FROM probe')).rows).toEqual([{ id: 1, label: "retained" }]);
  expect(await historyCount()).toBe(2);
});
test("明示的トランザクションでDDL・データを戻し、失敗履歴をresolveして復旧する", async () => {
  const initial = 'CREATE TABLE probe (id integer PRIMARY KEY); INSERT INTO probe VALUES (1);';
  await fixtures([initial]); await migrate();
  await fixtures([initial, 'CREATE TABLE rolled_back (id integer); INSERT INTO probe VALUES (2); SELECT 1 / 0;']);
  await expect(migrate()).rejects.toThrow();
  expect(await historyCount()).toBe(1);
  expect((await connection.pool.query('SELECT * FROM probe')).rows).toEqual([{ id: 1 }]);
  expect((await connection.pool.query('SELECT to_regclass($1) AS name', [`${schema}.rolled_back`])).rows[0].name).toBeNull();
  await expect(migrate()).rejects.toMatchObject({ code: "P3009" });
  await runMigrationCommand(url, ["resolve", "--rolled-back", "20260927000001_test"], configPath);
  await fixtures([initial, 'INSERT INTO probe VALUES (2);']); await migrate();
  expect(await historyCount()).toBe(2);
});
test("公式CLIのロックにより同時適用でも一度だけ実行する", async () => {
  await fixtures(['SELECT pg_sleep(0.1); CREATE TABLE probe (id integer);']);
  await Promise.all([migrate(), migrate()]);
  expect(await historyCount()).toBe(1);
});

const seedEnv = { NODE_ENV: "test", SEED_ALLOW_DEVELOPMENT: "true", SEED_ADMIN_PASSWORD: "test-only-password-123" };
test("Seedを再実行してもID・編集内容・資格情報を保持する", async () => {
  await migrateDatabase(url);
  const first = await seedDevelopment(connection.db, seedEnv);
  const before = await connection.db.account.findFirstOrThrow();
  expect(before.password).not.toBe(seedEnv.SEED_ADMIN_PASSWORD);
  expect(await verifyPassword({ hash: before.password!, password: seedEnv.SEED_ADMIN_PASSWORD })).toBe(true);
  expect(before.providerId).toBe("credential");
  expect(before.accountId).toBe(first.userId);
  await connection.db.user.update({ where: { id: first.userId }, data: { name: "変更済み", isActive: false } });
  const second = await seedDevelopment(connection.db, { ...seedEnv, SEED_ADMIN_PASSWORD: "another-password-123" });
  expect(second).toEqual({ ...first, created: false });
  expect(await connection.db.user.findUniqueOrThrow({ where: { id: first.userId } })).toMatchObject({ name: "変更済み", isActive: false, emailVerified: false });
  expect((await connection.db.account.findFirstOrThrow()).password).toBe(before.password);
  expect(await connection.db.organization.count()).toBe(1);
  expect(await connection.db.department.count()).toBe(2);
  expect(await connection.db.user.count()).toBe(1);
});
test("組織をまたぐ親部署・所属とコード重複を拒否する", async () => {
  await migrateDatabase(url);
  const { organizationId, userId } = await seedDevelopment(connection.db, seedEnv);
  const other = await connection.db.organization.create({ data: { code: "other", name: "別組織" } });
  const department = await connection.db.department.create({ data: { organizationId: other.id, code: "administration", name: "別部署" } });
  await expect(connection.db.user.update({ where: { id: userId }, data: { departmentId: department.id } })).rejects.toMatchObject({ code: "P2003" });
  await expect(connection.db.department.create({ data: { organizationId, parentId: department.id, code: "invalid", name: "不可" } })).rejects.toMatchObject({ code: "P2003" });
  await expect(connection.db.department.create({ data: { organizationId, code: "administration", name: "重複" } })).rejects.toMatchObject({ code: "P2002" });
  await expect(connection.db.user.create({ data: { organizationId, employeeCode: "DEMO-001", name: "重複", email: "other@example.com" } })).rejects.toMatchObject({ code: "P2002" });
  await expect(connection.db.organization.delete({ where: { id: organizationId } })).rejects.toMatchObject({ code: "P2003" });
});
test("親部署変更は循環を拒否し、ルートへの移動を許可する", async () => {
  await migrateDatabase(url);
  const { organizationId } = await seedDevelopment(connection.db, seedEnv);
  const root = await connection.db.department.findFirstOrThrow({ where: { code: "head-office" } });
  const child = await connection.db.department.findFirstOrThrow({ where: { code: "administration" } });
  await expect(moveDepartment(connection.db, organizationId, root.id, child.id)).rejects.toThrow("循環");
  await expect(moveDepartment(connection.db, organizationId, child.id, child.id)).rejects.toThrow("循環");
  expect((await moveDepartment(connection.db, organizationId, child.id, null)).parentId).toBeNull();
  const results = await Promise.allSettled([
    moveDepartment(connection.db, organizationId, child.id, root.id),
    moveDepartment(connection.db, organizationId, root.id, child.id),
  ]);
  expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
});
test("Seedの既存ユーザー競合時には全体をロールバックする", async () => {
  await migrateDatabase(url);
  const organization = await connection.db.organization.create({ data: { code: "existing", name: "既存" } });
  await connection.db.user.create({ data: { organizationId: organization.id, email: "admin@example.com", name: "既存" } });
  await expect(seedDevelopment(connection.db, seedEnv)).rejects.toThrow("競合");
  expect(await connection.db.organization.count()).toBe(1);
  expect(await connection.db.department.count()).toBe(0);
  expect(await connection.db.account.count()).toBe(0);
});

const authConfig = getAuthConfig({ BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters-long", BETTER_AUTH_URL: "https://auth.example.test" });
async function authFixture() {
  await migrateDatabase(url);
  await seedDevelopment(connection.db, seedEnv);
  return createAuthentication(connection.db, authConfig);
}
function authRequest(path: string, body: object = {}, cookie = "", origin = authConfig.baseURL) {
  return new Request(`${authConfig.baseURL}/api/auth/${path}`, { method: "POST", headers: {
    origin, cookie, "content-type": "application/json",
  }, body: JSON.stringify(body) });
}
const credentials = { email: "admin@example.com", password: seedEnv.SEED_ADMIN_PASSWORD };
const sessionCookie = (response: Response) => response.headers.getSetCookie().map(cookie => cookie.split(";")[0]).join("; ");
test("標準認証でログイン・秘密情報非出力・ログアウト後の再利用拒否", async () => {
  const auth = await authFixture();
  expect(await getActiveUser(auth, connection.db, new Headers())).toBeNull();
  const response = await handleAuthentication(authRequest("sign-in/email", credentials), auth, authConfig);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true });
  const cookie = sessionCookie(response);
  expect(cookie).toContain("session_token");
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("set-cookie")).toContain("Secure");
  expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
  const headers = new Headers({ cookie });
  const user = await getActiveUser(auth, connection.db, headers);
  expect(user?.email).toBe(credentials.email);
  expect(user).not.toHaveProperty("password");
  expect(user).not.toHaveProperty("token");
  const logout = await handleAuthentication(authRequest("sign-out", {}, cookie), auth, authConfig);
  expect(logout.status).toBe(200);
  expect(await getActiveUser(auth, connection.db, headers)).toBeNull();
});
test("誤パスワード・無効ユーザー・未公開endpoint・異なるOriginを拒否", async () => {
  const auth = await authFixture();
  const wrong = await handleAuthentication(authRequest("sign-in/email", { ...credentials, password: "wrong-password" }), auth, authConfig);
  expect(wrong.status).toBe(401);
  const invalidOrigin = await handleAuthentication(authRequest("sign-in/email", credentials, "", "https://evil.example"), auth, authConfig);
  expect(invalidOrigin.status).toBe(403);
  expect((await handleAuthentication(authRequest("sign-up/email", credentials), auth, authConfig)).status).toBe(404);
  expect((await handleAuthentication(authRequest("update-user", { name: "changed", isActive: true }), auth, authConfig)).status).toBe(404);
  const user = await connection.db.user.findFirstOrThrow();
  await disableUser(connection.db, user.id);
  expect((await handleAuthentication(authRequest("sign-in/email", credentials), auth, authConfig)).ok).toBe(false);
  expect(await connection.db.session.count()).toBe(0);
});
test("有効期限切れと無効化後の既存セッションを拒否", async () => {
  const auth = await authFixture();
  const login = async () => {
    const response = await handleAuthentication(authRequest("sign-in/email", credentials), auth, authConfig);
    expect(response.status).toBe(200);
    return new Headers({ cookie: sessionCookie(response) });
  };
  const expired = await login();
  await connection.db.session.updateMany({ data: { expiresAt: new Date(0) } });
  expect(await getActiveUser(auth, connection.db, expired)).toBeNull();
  const active = await login();
  const user = await connection.db.user.findFirstOrThrow();
  await disableUser(connection.db, user.id);
  expect(await connection.db.session.count()).toBe(0);
  expect(await getActiveUser(auth, connection.db, active)).toBeNull();
  await connection.db.user.update({ where: { id: user.id }, data: { isActive: true } });
  const direct = await login();
  await connection.db.user.update({ where: { id: user.id }, data: { isActive: false } });
  expect(await getActiveUser(auth, connection.db, direct)).toBeNull();
  expect(await connection.db.session.count()).toBe(0);
});
test("ログイン試行制限をDBで共有し、偽装ヘッダーでも回避できない", async () => {
  const auth = await authFixture();
  for (let attempt = 0; attempt < 5; attempt++) {
    const request = authRequest("sign-in/email", { ...credentials, password: "wrong-password" });
    request.headers.set("x-kumuno-client-ip", `192.0.2.${attempt}`);
    request.headers.set("x-forwarded-for", `192.0.2.${attempt}`);
    expect((await handleAuthentication(request, auth, authConfig)).status).toBe(401);
  }
  const otherProcess = createAuthentication(connection.db, authConfig);
  const denied = await handleAuthentication(authRequest("sign-in/email", credentials), otherProcess, authConfig);
  expect(denied.status).toBe(429);
  expect(denied.headers.get("retry-after")).toBeTruthy();
  expect(await connection.db.session.count()).toBe(0);
});

test("ロールはDBの最新値を使い、Seed再実行とクライアント入力で昇格しない", async () => {
  const auth = await authFixture();
  const response = await handleAuthentication(authRequest("sign-in/email", { ...credentials, role: "ADMIN" }), auth, authConfig);
  expect(response.status).toBe(200);
  const headers = new Headers({ cookie: sessionCookie(response) });
  const admin = (await getActiveUser(auth, connection.db, headers))!;
  expect(admin.role).toBe("ADMIN");
  expect(can(admin, "roles:assign", admin)).toBe(true);
  const created = await connection.db.user.create({ data: { organizationId: admin.organizationId, name: "一般", email: "user@example.com" } });
  expect(created.role).toBe("USER");
  await connection.db.user.update({ where: { id: admin.id }, data: { role: "MANAGER" } });
  const manager = (await getActiveUser(auth, connection.db, headers))!;
  expect(can(manager, "users:read", manager)).toBe(true);
  expect(can(manager, "roles:assign", manager)).toBe(false);
  await connection.db.user.update({ where: { id: admin.id }, data: { role: "USER" } });
  await seedDevelopment(connection.db, seedEnv);
  const regular = (await getActiveUser(auth, connection.db, headers))!;
  expect(regular.role).toBe("USER");
  expect(can(regular, "users:read", regular)).toBe(false);
  expect((await handleAuthentication(authRequest("update-user", { role: "ADMIN" }, sessionCookie(response)), auth, authConfig)).status).toBe(404);
  const relogin = await handleAuthentication(authRequest("sign-in/email", { ...credentials, role: "ADMIN" }), auth, authConfig);
  expect(relogin.status).toBe(200);
  expect((await getActiveUser(auth, connection.db, new Headers({ cookie: sessionCookie(relogin) })))?.role).toBe("USER");
});
