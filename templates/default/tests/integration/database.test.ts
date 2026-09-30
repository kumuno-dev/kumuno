import { saveEquipment, deleteEquipment } from "../../src/equipment/service";
import { equipmentList, equipmentDetail } from "../../src/equipment/repository";
import { listQuery } from "../../src/equipment/validation";
import { saveUser, saveDepartment, deleteDepartment } from "../../src/management/service";
import { appendAuditLog } from "../../src/audit/log";
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
  expect(await historyCount()).toBe(6);
  await migrateDatabase(url);
  expect(await historyCount()).toBe(6);
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
  const { organizationId, userId } = await seedDevelopment(connection.db, seedEnv);
  const root = await connection.db.department.findFirstOrThrow({ where: { code: "head-office" } });
  const child = await connection.db.department.findFirstOrThrow({ where: { code: "administration" } });
  await expect(moveDepartment(connection.db, userId, organizationId, root.id, child.id)).rejects.toThrow("循環");
  await expect(moveDepartment(connection.db, userId, organizationId, child.id, child.id)).rejects.toThrow("循環");
  expect((await moveDepartment(connection.db, userId, organizationId, child.id, null)).parentId).toBeNull();
  const results = await Promise.allSettled([
    moveDepartment(connection.db, userId, organizationId, child.id, root.id),
    moveDepartment(connection.db, userId, organizationId, root.id, child.id),
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
  await disableUser(connection.db, user.id, user.id);
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
  await disableUser(connection.db, user.id, user.id);
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


test("部署移動と無効化の監査を更新と同時に保存し、無変更では重複しない", async () => {
  const auth = await authFixture();
  const admin = await connection.db.user.findFirstOrThrow();
  const target = await connection.db.user.create({ data: { organizationId: admin.organizationId, name: "対象", email: "target@example.com" } });
  const department = await connection.db.department.findFirstOrThrow({ where: { code: "administration" } });
  await moveDepartment(connection.db, admin.id, admin.organizationId, department.id, null);
  await moveDepartment(connection.db, admin.id, admin.organizationId, department.id, null);
  await disableUser(connection.db, admin.id, target.id);
  await disableUser(connection.db, admin.id, target.id);
  const logs = await connection.db.auditLog.findMany({ orderBy: { timestamp: "asc" } });
  expect(logs).toHaveLength(2);
  expect(logs[0]).toMatchObject({ organizationId: admin.organizationId, userId: admin.id, action: "UPDATE", resourceType: "Department", resourceId: department.id,
    before: { parentId: department.parentId }, after: { parentId: null }, metadata: { version: 1 } });
  expect(logs[1]).toMatchObject({ userId: admin.id, resourceType: "User", resourceId: target.id, before: { isActive: true }, after: { isActive: false } });
  expect(logs[0].timestamp).toBeInstanceOf(Date);
  expect(JSON.stringify(logs)).not.toContain(target.email);
  const login = await handleAuthentication(authRequest("sign-in/email", credentials), auth, authConfig);
  expect(login.status).toBe(200);
  await disableUser(connection.db, admin.id, admin.id);
  expect(await connection.db.session.count()).toBe(0);
  expect(await connection.db.auditLog.count()).toBe(3);
});

test("監査対象の更新は最新権限・有効状態・組織境界を検査する", async () => {
  await migrateDatabase(url);
  const { organizationId, userId } = await seedDevelopment(connection.db, seedEnv);
  const department = await connection.db.department.findFirstOrThrow({ where: { code: "administration" } });
  const other = await connection.db.organization.create({ data: { code: "other", name: "別組織" } });
  const outsider = await connection.db.user.create({ data: { organizationId: other.id, role: "ADMIN", name: "外部", email: "outsider@example.com" } });
  await expect(disableUser(connection.db, outsider.id, userId)).rejects.toMatchObject({ status: 403 });
  await expect(moveDepartment(connection.db, outsider.id, organizationId, department.id, null)).rejects.toMatchObject({ status: 403 });
  for (const role of ["MANAGER", "USER"] as const) {
    await connection.db.user.update({ where: { id: userId }, data: { role } });
    await expect(disableUser(connection.db, userId, userId)).rejects.toMatchObject({ status: 403 });
    await expect(moveDepartment(connection.db, userId, organizationId, department.id, null)).rejects.toMatchObject({ status: 403 });
  }
  await connection.db.user.update({ where: { id: userId }, data: { role: "ADMIN", isActive: false } });
  await expect(moveDepartment(connection.db, userId, organizationId, department.id, null)).rejects.toMatchObject({ status: 403 });
  expect(await connection.db.auditLog.count()).toBe(0);
  expect((await connection.db.department.findUniqueOrThrow({ where: { id: department.id } })).parentId).toBe(department.parentId);
});

test("監査のINSERT失敗時は業務更新とセッション削除もロールバックする", async () => {
  const auth = await authFixture();
  const admin = await connection.db.user.findFirstOrThrow();
  const department = await connection.db.department.findFirstOrThrow({ where: { code: "administration" } });
  expect((await handleAuthentication(authRequest("sign-in/email", credentials), auth, authConfig)).status).toBe(200);
  await connection.pool.query(`CREATE FUNCTION "${schema}".fail_audit_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END; $$`);
  await connection.pool.query(`CREATE TRIGGER fail_audit_insert BEFORE INSERT ON "${schema}"."AuditLog" FOR EACH STATEMENT EXECUTE FUNCTION "${schema}".fail_audit_insert()`);
  await expect(disableUser(connection.db, admin.id, admin.id)).rejects.toThrow();
  expect((await connection.db.user.findUniqueOrThrow({ where: { id: admin.id } })).isActive).toBe(true);
  expect(await connection.db.session.count()).toBe(1);
  await expect(moveDepartment(connection.db, admin.id, admin.organizationId, department.id, null)).rejects.toThrow();
  expect((await connection.db.department.findUniqueOrThrow({ where: { id: department.id } })).parentId).toBe(department.parentId);
  expect(await connection.db.auditLog.count()).toBe(0);
});

test("CREATE/DELETEを記録し、履歴の更新・削除・TRUNCATEを拒否する", async () => {
  await migrateDatabase(url);
  const { userId, organizationId } = await seedDevelopment(connection.db, seedEnv);
  const actor = { id: userId, organizationId };
  const resourceId = await connection.db.$transaction(async tx => {
    const department = await tx.department.create({ data: { organizationId, code: "audit-test", name: "監査対象" } });
    await appendAuditLog(tx, actor, { action: "CREATE", resourceType: "Department", resourceId: department.id, after: department });
    await tx.department.delete({ where: { id: department.id } });
    await appendAuditLog(tx, actor, { action: "DELETE", resourceType: "Department", resourceId: department.id, before: department });
    return department.id;
  });
  const logs = await connection.db.auditLog.findMany({ where: { resourceId } });
  expect(logs).toHaveLength(2);
  expect(logs.find(log => log.action === "CREATE")?.before).toBeNull();
  expect(logs.find(log => log.action === "DELETE")?.after).toBeNull();
  await expect(connection.db.auditLog.updateMany({ data: { metadata: { tampered: true } } })).rejects.toThrow();
  await expect(connection.db.auditLog.deleteMany()).rejects.toThrow();
  await expect(connection.pool.query(`TRUNCATE "${schema}"."AuditLog"`)).rejects.toMatchObject({ code: "42501" });
  await connection.db.user.delete({ where: { id: userId } });
  expect(await connection.db.auditLog.count({ where: { userId } })).toBe(2);
});

function managementForm(data: Record<string, string>) {
  const form = new FormData(); for (const [key, value] of Object.entries(data)) form.set(key, value); return form;
}
const newUserFields = { id: "", name: "登録メンバー", email: "member@example.com", employeeCode: "M-001", departmentId: "", role: "USER", isActive: "true", password: "new-password-123" };
test("管理画面の登録・編集は標準Account、監査、セッション失効へつながる", async () => {
  await migrateDatabase(url);
  const { userId, organizationId } = await seedDevelopment(connection.db, seedEnv);
  const departmentId = await saveDepartment(connection.db, userId, organizationId, managementForm({ id: "", code: "new", name: "新部署", parentId: "" }));
  const id = await saveUser(connection.db, userId, organizationId, managementForm({ ...newUserFields, departmentId }));
  const account = await connection.db.account.findFirstOrThrow({ where: { userId: id } });
  expect(account.providerId).toBe("credential");
  expect(await verifyPassword({ hash: account.password!, password: newUserFields.password })).toBe(true);
  const auth = createAuthentication(connection.db, authConfig);
  const login = await handleAuthentication(authRequest("sign-in/email", { email: newUserFields.email, password: newUserFields.password }), auth, authConfig);
  expect(login.status).toBe(200);
  await connection.db.session.create({ data: { userId: id, token: randomUUID(), expiresAt: new Date(Date.now() + 60000) } });
  await saveUser(connection.db, userId, organizationId, managementForm({ ...newUserFields, id, departmentId, role: "MANAGER", isActive: "false" }));
  expect(await connection.db.session.count({ where: { userId: id } })).toBe(0);
  await saveUser(connection.db, userId, organizationId, managementForm({ ...newUserFields, id, role: "MANAGER" }));
  expect((await connection.db.user.findUniqueOrThrow({ where: { id } })).isActive).toBe(true);
  await deleteDepartment(connection.db, userId, organizationId, departmentId);
  expect(await connection.db.auditLog.count()).toBe(5);
  expect(JSON.stringify(await connection.db.auditLog.findMany())).not.toContain(newUserFields.password);
});
test("管理サービスで越境・自己降格・参照ロールの書込・循環・関連部署削除を拒否する", async () => {
  await migrateDatabase(url);
  const { userId, organizationId } = await seedDevelopment(connection.db, seedEnv);
  const other = await connection.db.organization.create({ data: { code: "other", name: "別組織" } });
  const otherDepartment = await connection.db.department.create({ data: { organizationId: other.id, code: "other", name: "別部署" } });
  await expect(saveUser(connection.db, userId, organizationId, managementForm({ ...newUserFields, departmentId: otherDepartment.id }))).rejects.toThrow();
  await expect(saveDepartment(connection.db, userId, organizationId, managementForm({ id: otherDepartment.id, code: "hijack", name: "不可", parentId: "" }))).rejects.toThrow();
  await expect(saveUser(connection.db, userId, organizationId, managementForm({ ...newUserFields, id: userId }))).rejects.toThrow("自分自身");
  const root = await connection.db.department.findFirstOrThrow({ where: { code: "head-office" } });
  const child = await connection.db.department.findFirstOrThrow({ where: { code: "administration" } });
  await expect(saveDepartment(connection.db, userId, organizationId, managementForm({ id: root.id, code: root.code, name: root.name, parentId: child.id }))).rejects.toThrow("循環");
  await expect(deleteDepartment(connection.db, userId, organizationId, root.id)).rejects.toThrow("子部署");
  await expect(deleteDepartment(connection.db, userId, organizationId, child.id)).rejects.toThrow("所属ユーザー");
  await connection.db.user.update({ where: { id: userId }, data: { role: "MANAGER" } });
  await expect(saveUser(connection.db, userId, organizationId, managementForm(newUserFields))).rejects.toMatchObject({ status: 403 });
  await expect(deleteDepartment(connection.db, userId, organizationId, root.id)).rejects.toMatchObject({ status: 403 });
  expect(await connection.db.auditLog.count()).toBe(0);
});
test("監査失敗時は管理画面のユーザー作成とAccountも残らない", async () => {
  await migrateDatabase(url);
  const { userId, organizationId } = await seedDevelopment(connection.db, seedEnv);
  await connection.pool.query(`CREATE FUNCTION "${schema}".fail_management_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END; $$`);
  await connection.pool.query(`CREATE TRIGGER fail_management_audit BEFORE INSERT ON "${schema}"."AuditLog" FOR EACH STATEMENT EXECUTE FUNCTION "${schema}".fail_management_audit()`);
  await expect(saveUser(connection.db, userId, organizationId, managementForm(newUserFields))).rejects.toThrow();
  expect(await connection.db.user.count()).toBe(1);
  expect(await connection.db.account.count()).toBe(1);
});

test("管理者同士の同時降格でも有効な管理者を残す", async () => {
  await migrateDatabase(url);
  const { userId, organizationId } = await seedDevelopment(connection.db, seedEnv);
  const other = await saveUser(connection.db, userId, organizationId, managementForm({ ...newUserFields, role: "ADMIN" }));
  const result = await Promise.allSettled([
    saveUser(connection.db, userId, organizationId, managementForm({ ...newUserFields, id: other, role: "USER" })),
    saveUser(connection.db, other, organizationId, managementForm({ ...newUserFields, id: userId, email: "admin@example.com", employeeCode: "DEMO-001", role: "USER" })),
  ]);
  expect(result.filter(r => r.status === "rejected")).toHaveLength(1);
  expect(await connection.db.user.count({ where: { organizationId, role: "ADMIN", isActive: true } })).toBe(1);
});

const equipmentFields = { id: "", name: "ノートPC", category: "端末", purchaseDate: "2026-10-01", purchasePrice: "123456.78", departmentId: "", assignedUserId: "", status: "STORAGE", notes: "自由入力の備考" };
test("備品CRUDは共有マスタとDecimal・日付・監査を維持する", async () => {
 await migrateDatabase(url);
 const { userId, organizationId } = await seedDevelopment(connection.db, seedEnv);
 const department = await connection.db.department.findFirstOrThrow();
 const id = await saveEquipment(connection.db,userId,organizationId,managementForm({ ...equipmentFields, departmentId: department.id, assignedUserId: userId }));
 const before = await equipmentDetail(connection.db,organizationId,id);
 expect(before?.purchasePrice?.toString()).toBe("123456.78");
 expect(before?.purchaseDate?.toISOString().slice(0,10)).toBe("2026-10-01");
 expect(before?.assignedUser?.name).toBe("開発用管理者");
 await saveEquipment(connection.db,userId,organizationId,managementForm({ ...equipmentFields,id,status: "IN_USE" }));
 await deleteEquipment(connection.db,userId,organizationId,id);
 expect(await equipmentDetail(connection.db,organizationId,id)).toBeNull();
 const logs = await connection.db.auditLog.findMany({ where: { resourceId: id } });
 expect(logs.map(l=>l.action).sort()).toEqual(["CREATE","DELETE","UPDATE"]);
 expect(JSON.stringify(logs)).not.toContain(equipmentFields.notes);
 expect(logs.find(l=>l.action==="CREATE")?.after).toMatchObject({ purchasePrice: "123456.78" });
});
test("備品の越境・User書込・無効担当者を拒否し、Managerを許可する", async () => {
 await migrateDatabase(url);
 const { userId,organizationId } = await seedDevelopment(connection.db,seedEnv);
 const other = await connection.db.organization.create({ data: { code:"other", name:"外部" } });
 const department = await connection.db.department.create({ data: { organizationId:other.id,code:"external",name:"外部部署" } });
 const outsider = await connection.db.user.create({ data: { organizationId:other.id,name:"外部",email:"outside@example.com" } });
 await expect(saveEquipment(connection.db,userId,organizationId,managementForm({ ...equipmentFields,departmentId:department.id }))).rejects.toThrow();
 await expect(saveEquipment(connection.db,userId,organizationId,managementForm({ ...equipmentFields,assignedUserId:outsider.id }))).rejects.toThrow();
 await expect(connection.db.equipment.create({ data: { organizationId,name:"不可",category:"端末",departmentId:department.id } })).rejects.toMatchObject({ code:"P2003" });
 await expect(connection.db.equipment.create({ data: { organizationId,name:"不可",category:"端末",assignedUserId:outsider.id } })).rejects.toMatchObject({ code:"P2003" });
 const id = await saveEquipment(connection.db,userId,organizationId,managementForm(equipmentFields));
 expect(await equipmentDetail(connection.db,other.id,id)).toBeNull();
 await expect(deleteEquipment(connection.db,outsider.id,other.id,id)).rejects.toThrow();
 await connection.db.user.update({ where:{id:userId},data:{role:"USER"} });
 await expect(saveEquipment(connection.db,userId,organizationId,managementForm(equipmentFields))).rejects.toMatchObject({status:403});
 await expect(deleteEquipment(connection.db,userId,organizationId,id)).rejects.toMatchObject({status:403});
 await connection.db.user.update({ where:{id:userId},data:{role:"MANAGER"} });
 await saveEquipment(connection.db,userId,organizationId,managementForm({ ...equipmentFields,id,status:"REPAIR" }));
 await connection.db.user.update({ where:{id:outsider.id},data:{isActive:false} });
 await expect(saveEquipment(connection.db,userId,organizationId,managementForm({ ...equipmentFields,assignedUserId:outsider.id }))).rejects.toThrow();
});
test("備品一覧は検索・安定したページ切替・並び順と組織境界を守る", async () => {
 await migrateDatabase(url);
 const { organizationId } = await seedDevelopment(connection.db,seedEnv);
 await connection.db.equipment.createMany({ data:Array.from({length:12},(_,i)=>({organizationId,name:`PC-${String(i).padStart(2,"0")}`,category:"端末",purchasePrice:String(i)})) });
 const first = await equipmentList(connection.db,organizationId,listQuery({q:"pc",sort:"name"}));
 const second = await equipmentList(connection.db,organizationId,listQuery({q:"pc",sort:"name",page:"2"}));
 expect(first.rows).toHaveLength(10); expect(second.rows).toHaveLength(2);
 expect(new Set([...first.rows,...second.rows].map(e=>e.id)).size).toBe(12);
 expect((await equipmentList(connection.db,organizationId,listQuery({sort:"price"}))).rows[0].purchasePrice?.toString()).toBe("11");
 expect((await equipmentList(connection.db,organizationId,listQuery({q:"PC-03"}))).total).toBe(1);
 expect((await equipmentList(connection.db,organizationId,listQuery({page:"9999"}))).page).toBe(2);
 expect((await equipmentList(connection.db,randomUUID(),listQuery({}))).total).toBe(0);
});
test("備品の監査INSERTが失敗したら登録・更新・削除を全て戻す", async () => {
 await migrateDatabase(url);
 const {userId,organizationId} = await seedDevelopment(connection.db,seedEnv);
 const id = await saveEquipment(connection.db,userId,organizationId,managementForm(equipmentFields));
 await connection.pool.query(`CREATE FUNCTION "${schema}".fail_equipment_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END; $$`);
 await connection.pool.query(`CREATE TRIGGER fail_equipment_audit BEFORE INSERT ON "${schema}"."AuditLog" FOR EACH STATEMENT EXECUTE FUNCTION "${schema}".fail_equipment_audit()`);
 await expect(saveEquipment(connection.db,userId,organizationId,managementForm(equipmentFields))).rejects.toThrow();
 await expect(saveEquipment(connection.db,userId,organizationId,managementForm({...equipmentFields,id,status:"DISPOSED"}))).rejects.toThrow();
 await expect(deleteEquipment(connection.db,userId,organizationId,id)).rejects.toThrow();
 expect(await connection.db.equipment.count()).toBe(1);
 expect((await equipmentDetail(connection.db,organizationId,id))?.status).toBe("STORAGE");
});
