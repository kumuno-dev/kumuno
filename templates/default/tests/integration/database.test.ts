import { markNotificationRead } from "../../src/notifications/service";
import { notificationList,unreadNotificationCount } from "../../src/notifications/repository";
import { previewMedicalImport,importMedicalDevices,issueImportToken } from "../../src/medical-equipment/csv-import";
import { parseCsv } from "@kumuno/csv";
import { exportMedicalDevices,medicalCsvHeaders } from "../../src/medical-equipment/csv-export";
import { medicalOverview } from "../../src/medical-equipment/overview";
import { createMedicalSamples } from "../../src/medical-equipment/samples";
import { saveMedicalRepair,medicalRepairList,repairQuery } from "../../src/medical-equipment/repairs";
import { recordMedicalInspection,medicalInspectionList,inspectionQuery,todayInJapan } from "../../src/medical-equipment/inspections";
import { lendMedicalDevice, returnMedicalDevice, medicalLoanList, loanQuery } from "../../src/medical-equipment/loans";
import { saveMedicalDevice } from "../../src/medical-equipment/service";
import { medicalDeviceList, medicalDeviceDetail } from "../../src/medical-equipment/repository";
import { listQuery as medicalQuery } from "../../src/medical-equipment/validation";
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
import { mkdtemp, mkdir, writeFile, rm, cp, readdir } from "node:fs/promises";
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
  expect(await historyCount()).toBe(12);
  await migrateDatabase(url);
  expect(await historyCount()).toBe(12);
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

const medicalFields = { id:"",managementNumber:"ME-001",assetNumber:"A-01",name:"試用ポンプ",category:"輸液ポンプ",manufacturer:"サンプルメーカー",modelName:"DEMO",serialNumber:"SN-01",departmentId:"",location:"機器室",purchaseDate:"2026-10-01",warrantyUntil:"2027-10-01",status:"IN_SERVICE",notes:"監査に含めない自由入力" };
test("医療機器台帳は登録・編集・番号重複拒否・日付・監査を維持する", async () => {
  await migrateDatabase(url);
  const {userId,organizationId} = await seedDevelopment(connection.db,seedEnv);
  const department = await connection.db.department.findFirstOrThrow();
  const id = await saveMedicalDevice(connection.db,userId,organizationId,managementForm({...medicalFields,departmentId:department.id}));
  expect(await medicalDeviceDetail(connection.db,organizationId,id)).toMatchObject({managementNumber:"ME-001",department:{name:department.name}});
  await expect(saveMedicalDevice(connection.db,userId,organizationId,managementForm(medicalFields))).rejects.toMatchObject({code:"P2002"});
  await saveMedicalDevice(connection.db,userId,organizationId,managementForm({...medicalFields,id,status:"SUSPENDED"}));
  const e = await medicalDeviceDetail(connection.db,organizationId,id);
  expect(e?.status).toBe("SUSPENDED"); expect(e?.warrantyUntil?.toISOString().slice(0,10)).toBe("2027-10-01");
  const logs = await connection.db.auditLog.findMany({where:{resourceId:id},orderBy:{timestamp:"asc"}});
  expect(logs.map(l=>l.action)).toEqual(["CREATE","UPDATE"]);
  expect(logs[1].before).toMatchObject({status:"IN_SERVICE"});
  expect(logs[1].after).toMatchObject({status:"SUSPENDED",managementNumber:"ME-001"});
  expect(JSON.stringify(logs)).not.toContain(medicalFields.notes);
});
test("医療機器台帳は組織境界と最新の管理権限を守る", async () => {
  await migrateDatabase(url);
  const {userId,organizationId} = await seedDevelopment(connection.db,seedEnv);
  const other = await connection.db.organization.create({data:{code:"other",name:"外部"}});
  const dept = await connection.db.department.create({data:{organizationId:other.id,code:"ward",name:"外部病棟"}});
  await expect(saveMedicalDevice(connection.db,userId,organizationId,managementForm({...medicalFields,departmentId:dept.id}))).rejects.toThrow();
  await expect(connection.db.medicalDevice.create({data:{organizationId,managementNumber:"X",name:"不可",category:"端末",departmentId:dept.id}})).rejects.toMatchObject({code:"P2003"});
  const id = await saveMedicalDevice(connection.db,userId,organizationId,managementForm(medicalFields));
  expect(await medicalDeviceDetail(connection.db,other.id,id)).toBeNull();
  await expect(saveMedicalDevice(connection.db,userId,other.id,managementForm({...medicalFields,id}))).rejects.toMatchObject({status:403});
  await connection.db.user.update({where:{id:userId},data:{role:"USER"}});
  await expect(saveMedicalDevice(connection.db,userId,organizationId,managementForm({...medicalFields,id}))).rejects.toMatchObject({status:403});
  await connection.db.user.update({where:{id:userId},data:{role:"MANAGER"}});
  await saveMedicalDevice(connection.db,userId,organizationId,managementForm({...medicalFields,id,status:"RETIRED"}));
  await connection.db.user.update({where:{id:userId},data:{isActive:false}});
  await expect(saveMedicalDevice(connection.db,userId,organizationId,managementForm({...medicalFields,id}))).rejects.toMatchObject({status:403});
});
test("医療機器台帳の検索・状態・ページは組織内で一致する", async () => {
  await migrateDatabase(url);
  const {organizationId} = await seedDevelopment(connection.db,seedEnv);
  await connection.db.medicalDevice.createMany({data:Array.from({length:12},(_,i)=>({organizationId,managementNumber:`ME-${String(i).padStart(2,"0")}`,name:"試用",category:"ポンプ",manufacturer:"TestCo",status:i===0 ? "SUSPENDED" as const : "IN_SERVICE" as const}))});
  const first = await medicalDeviceList(connection.db,organizationId,medicalQuery({q:"testco"}));
  const second = await medicalDeviceList(connection.db,organizationId,medicalQuery({page:"2"}));
  expect(first.rows).toHaveLength(10); expect(second.rows).toHaveLength(2);
  expect(new Set([...first.rows,...second.rows].map(e=>e.id)).size).toBe(12);
  expect((await medicalDeviceList(connection.db,organizationId,medicalQuery({q:"ME-01"}))).total).toBe(1);
  expect((await medicalDeviceList(connection.db,organizationId,medicalQuery({status:"SUSPENDED"}))).total).toBe(1);
  expect((await medicalDeviceList(connection.db,organizationId,medicalQuery({page:"9999"}))).page).toBe(2);
  expect((await medicalDeviceList(connection.db,randomUUID(),medicalQuery({}))).total).toBe(0);
});
test("医療機器の監査失敗時は登録・編集を取り消す", async () => {
  await migrateDatabase(url);
  const {userId,organizationId} = await seedDevelopment(connection.db,seedEnv);
  const id = await saveMedicalDevice(connection.db,userId,organizationId,managementForm(medicalFields));
  await connection.pool.query(`CREATE FUNCTION "${schema}".fail_medical_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END; $$`);
  await connection.pool.query(`CREATE TRIGGER fail_medical_audit BEFORE INSERT ON "${schema}"."AuditLog" FOR EACH STATEMENT EXECUTE FUNCTION "${schema}".fail_medical_audit()`);
  await expect(saveMedicalDevice(connection.db,userId,organizationId,managementForm({...medicalFields,managementNumber:"ME-002"}))).rejects.toThrow();
  await expect(saveMedicalDevice(connection.db,userId,organizationId,managementForm({...medicalFields,id,status:"RETIRED"}))).rejects.toThrow();
  expect(await connection.db.medicalDevice.count()).toBe(1);
  expect((await medicalDeviceDetail(connection.db,organizationId,id))?.status).toBe("IN_SERVICE");
});

test("医療機器Migrationを既存の共通マスタ・備品へ追加してもデータを保持する", async () => {
  await mkdir(join(folder,"migrations"),{recursive:true});
  for (const entry of await readdir("prisma/migrations")) {
    if (["20261001090000_medical_device","20261001100000_medical_loans","20261001110000_medical_inspections","20261001120000_medical_repairs","20261001130000_medical_samples","20261004090000_notifications"].includes(entry)) continue;
    await cp(join("prisma/migrations",entry),join(folder,"migrations",entry),{recursive:true});
  }
  await migrate();
  expect(await historyCount()).toBe(6);
  const {userId,organizationId} = await seedDevelopment(connection.db,seedEnv);
  const equipmentId = await saveEquipment(connection.db,userId,organizationId,managementForm(equipmentFields));
  await migrateDatabase(url);
  expect(await historyCount()).toBe(12);
  expect(await equipmentDetail(connection.db,organizationId,equipmentId)).toMatchObject({name:equipmentFields.name});
  const id = await saveMedicalDevice(connection.db,userId,organizationId,managementForm(medicalFields));
  expect(await medicalDeviceDetail(connection.db,organizationId,id)).toMatchObject({name:medicalFields.name});
  expect(await connection.db.user.count()).toBe(1);
});

async function medicalLoanFixture() {
  await migrateDatabase(url);
  const actor = await seedDevelopment(connection.db,seedEnv);
  const deviceId = await saveMedicalDevice(connection.db,actor.userId,actor.organizationId,managementForm(medicalFields));
  const department = await connection.db.department.findFirstOrThrow();
  return {...actor,deviceId,departmentId:department.id,form:managementForm({deviceId,departmentId:department.id,destinationLocation:"試用病棟の置場"})};
}
test("医療機器の貸出・返却と点検待ち・履歴・監査を同時に保存する", async () => {
  const f = await medicalLoanFixture();
  await lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form);
  const loan = await connection.db.medicalLoan.findFirstOrThrow();
  expect(loan.loanedById).toBe(f.userId); expect(loan.returnedAt).toBeNull();
  await expect(lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form)).rejects.toThrow();
  await expect(saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,id:f.deviceId,status:"RETIRED"}))).rejects.toThrow();
  await returnMedicalDevice(connection.db,f.userId,f.organizationId,loan.id);
  const returnedLoan = await connection.db.medicalLoan.findUniqueOrThrow({where:{id:loan.id}});
  expect(returnedLoan).toMatchObject({returnedById:f.userId});
  expect(Math.abs(returnedLoan.returnedAt!.getTime()-Date.now())).toBeLessThan(60_000);
  expect((await medicalDeviceDetail(connection.db,f.organizationId,f.deviceId))?.returnInspectionPending).toBe(true);
  await expect(returnMedicalDevice(connection.db,f.userId,f.organizationId,loan.id)).rejects.toThrow();
  await expect(lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form)).rejects.toThrow();
  await saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,id:f.deviceId}));
  expect((await medicalDeviceDetail(connection.db,f.organizationId,f.deviceId))?.returnInspectionPending).toBe(true);
  expect((await medicalLoanList(connection.db,f.organizationId,loanQuery({}))).total).toBe(0);
  expect((await medicalLoanList(connection.db,f.organizationId,loanQuery({state:"returned",q:"ME-001"}))).total).toBe(1);
  const logs = await connection.db.auditLog.findMany({where:{resourceId:loan.id}});
  expect(logs.map(l=>l.action).sort()).toEqual(["CREATE","UPDATE"]);
  expect(JSON.stringify(logs)).not.toContain("試用病棟の置場");
  expect(await connection.db.auditLog.findFirst({where:{resourceId:f.deviceId,action:"UPDATE"}})).toMatchObject({after:{returnInspectionPending:true}});
});
test("同時貸出・同時返却は一度だけ成功し、DBも二重貸出を拒否する", async () => {
  const f = await medicalLoanFixture();
  const issued = await Promise.allSettled([lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form),lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form)]);
  expect(issued.filter(x=>x.status === "fulfilled")).toHaveLength(1);
  expect(await connection.db.medicalLoan.count()).toBe(1);
  const loan = await connection.db.medicalLoan.findFirstOrThrow();
  await expect(connection.db.medicalLoan.create({data:{organizationId:f.organizationId,deviceId:f.deviceId,departmentId:f.departmentId,destinationName:"二重",loanedById:f.userId}})).rejects.toMatchObject({code:"P2002"});
  const returned = await Promise.allSettled([returnMedicalDevice(connection.db,f.userId,f.organizationId,loan.id),returnMedicalDevice(connection.db,f.userId,f.organizationId,loan.id)]);
  expect(returned.filter(x=>x.status === "fulfilled")).toHaveLength(1);
  expect(await connection.db.auditLog.count({where:{resourceId:loan.id,action:"UPDATE"}})).toBe(1);
});
test("貸出と返却は越境・読取専用・無効ユーザー・停止機器を拒否する", async () => {
  const f = await medicalLoanFixture();
  const other = await connection.db.organization.create({data:{code:"outside",name:"外部"}});
  const department = await connection.db.department.create({data:{organizationId:other.id,code:"other",name:"外部部署"}});
  const outsider = await connection.db.user.create({data:{organizationId:other.id,email:"other@loan.example",name:"外部管理者",role:"ADMIN"}});
  await expect(lendMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({deviceId:f.deviceId,departmentId:department.id,destinationLocation:""}))).rejects.toThrow();
  await expect(lendMedicalDevice(connection.db,outsider.id,other.id,f.form)).rejects.toThrow();
  await expect(connection.db.medicalLoan.create({data:{organizationId:f.organizationId,deviceId:f.deviceId,departmentId:department.id,destinationName:"不可",loanedById:f.userId}})).rejects.toMatchObject({code:"P2003"});
  await saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,id:f.deviceId,status:"SUSPENDED"}));
  await expect(lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form)).rejects.toThrow();
  await saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,id:f.deviceId}));
  await connection.db.user.update({where:{id:f.userId},data:{role:"USER"}});
  await expect(lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form)).rejects.toMatchObject({status:403});
  await connection.db.user.update({where:{id:f.userId},data:{role:"MANAGER"}});
  await lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form);
  const loan = await connection.db.medicalLoan.findFirstOrThrow();
  expect((await medicalLoanList(connection.db,other.id,loanQuery({}))).total).toBe(0);
  await expect(returnMedicalDevice(connection.db,outsider.id,other.id,loan.id)).rejects.toThrow();
  await connection.db.user.update({where:{id:f.userId},data:{role:"USER"}});
  await expect(returnMedicalDevice(connection.db,f.userId,f.organizationId,loan.id)).rejects.toMatchObject({status:403});
  await connection.db.user.update({where:{id:f.userId},data:{role:"MANAGER",isActive:false}});
  await expect(returnMedicalDevice(connection.db,f.userId,f.organizationId,loan.id)).rejects.toMatchObject({status:403});
});
test("貸出・返却の監査失敗時は貸出履歴と点検待ちを全て取り消す", async () => {
  const f = await medicalLoanFixture();
  await lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form);
  const loan = await connection.db.medicalLoan.findFirstOrThrow();
  await connection.pool.query(`CREATE FUNCTION "${schema}".fail_loan_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END; $$`);
  await connection.pool.query(`CREATE TRIGGER fail_loan_audit BEFORE INSERT ON "${schema}"."AuditLog" FOR EACH STATEMENT EXECUTE FUNCTION "${schema}".fail_loan_audit()`);
  await expect(returnMedicalDevice(connection.db,f.userId,f.organizationId,loan.id)).rejects.toThrow();
  expect((await connection.db.medicalLoan.findUniqueOrThrow({where:{id:loan.id}})).returnedAt).toBeNull();
  expect((await connection.db.medicalDevice.findUniqueOrThrow({where:{id:f.deviceId}})).returnInspectionPending).toBe(false);
  const id = await connection.db.medicalDevice.create({data:{organizationId:f.organizationId,managementNumber:"ME-002",name:"別機器",category:"ポンプ"}});
  await expect(lendMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({deviceId:id.id,departmentId:f.departmentId,destinationLocation:""}))).rejects.toThrow();
  expect(await connection.db.medicalLoan.count()).toBe(1);
});
test("貸出一覧は検索・ページ・返却状態と過去の貸出先名を保持する", async () => {
  const f = await medicalLoanFixture();
  const devices = await Promise.all(Array.from({length:12},(_,i)=>connection.db.medicalDevice.create({data:{organizationId:f.organizationId,managementNumber:`L-${i}`,name:"試用",category:"ポンプ"}})));
  await connection.db.medicalLoan.createMany({data:devices.map(d=>({organizationId:f.organizationId,deviceId:d.id,departmentId:f.departmentId,destinationName:"試用病棟",loanedById:f.userId}))});
  const first = await medicalLoanList(connection.db,f.organizationId,loanQuery({q:"試用病棟"}));
  const second = await medicalLoanList(connection.db,f.organizationId,loanQuery({page:"2"}));
  expect(first.rows).toHaveLength(10); expect(second.rows).toHaveLength(2);
  expect(new Set([...first.rows,...second.rows].map(x=>x.id)).size).toBe(12);
  expect((await medicalLoanList(connection.db,f.organizationId,loanQuery({page:"9999"}))).page).toBe(2);
  await connection.db.department.update({where:{id:f.departmentId},data:{name:"改名後"}});
  expect((await medicalLoanList(connection.db,f.organizationId,loanQuery({q:"試用病棟"}))).total).toBe(12);
});

test("既存7Migrationの医療機器台帳へ貸出Migrationを追加しても機器を保持する", async () => {
  await mkdir(join(folder,"migrations"),{recursive:true});
  for (const entry of await readdir("prisma/migrations")) {
    if (["20261001100000_medical_loans","20261001110000_medical_inspections","20261001120000_medical_repairs","20261001130000_medical_samples","20261004090000_notifications"].includes(entry)) continue;
    await cp(join("prisma/migrations",entry),join(folder,"migrations",entry),{recursive:true});
  }
  await migrate();
  const org = randomUUID(), device = randomUUID();
  await connection.pool.query('INSERT INTO "Organization" (id,code,name,"updatedAt") VALUES ($1,$2,$3,now())',[org,"prior","以前の組織"]);
  await connection.pool.query('INSERT INTO "MedicalDevice" (id,"organizationId","managementNumber",name,category,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())',[device,org,"ME-PRIOR","以前の機器","ポンプ"]);
  expect(await historyCount()).toBe(7);
  await migrateDatabase(url);
  expect(await historyCount()).toBe(12);
  expect(await medicalDeviceDetail(connection.db,org,device)).toMatchObject({name:"以前の機器",returnInspectionPending:false});
  expect(await connection.db.medicalLoan.count()).toBe(0);
});

test("search_path指定なしの生成アプリ接続でも貸出と返却を保存できる", async () => {
  const f = await medicalLoanFixture();
  const app = createDatabaseConnection(getDatabaseConfig({DATABASE_URL:url}));
  try {
    await lendMedicalDevice(app.db,f.userId,f.organizationId,f.form);
    const loan = await app.db.medicalLoan.findFirstOrThrow({where:{organizationId:f.organizationId}});
    await returnMedicalDevice(app.db,f.userId,f.organizationId,loan.id);
    expect((await medicalDeviceDetail(app.db,f.organizationId,f.deviceId))?.returnInspectionPending).toBe(true);
  } finally {await app.close();}
});

async function inspectionForm(deviceId:string,change:Record<string,string>={}) {
  const device = await connection.db.medicalDevice.findUniqueOrThrow({where:{id:deviceId}});
  return managementForm({deviceId,version:device.updatedAt.toISOString(),inspectionDate:todayInJapan(),nextInspectionDate:"",kind:"PERIODIC",result:"INCOMPLETE",content:"施設の手順に沿った試用確認",confirm:"yes",...change});
}
test("点検の未完了・不合格は停止し、合格で再貸出できる", async () => {
  const f = await medicalLoanFixture();
  await lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form);
  const loan = await connection.db.medicalLoan.findFirstOrThrow();
  await returnMedicalDevice(connection.db,f.userId,f.organizationId,loan.id);
  for (const result of ["INCOMPLETE","FAILED"]) {
    await recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId,{kind:"POST_RETURN",result}));
    await expect(lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form)).rejects.toThrow();
  }
  const old = await inspectionForm(f.deviceId,{kind:"POST_RETURN",result:"PASSED"});
  await recordMedicalInspection(connection.db,f.userId,f.organizationId,old);
  expect((await medicalDeviceDetail(connection.db,f.organizationId,f.deviceId))?.returnInspectionPending).toBe(false);
  const inspections = await connection.db.medicalInspection.findMany({where:{deviceId:f.deviceId}});
  expect(inspections).toHaveLength(3);
  expect(inspections.find(i=>i.result === "PASSED")).toMatchObject({clearedPending:true,inspectedById:f.userId,returnLoanId:loan.id});
  await lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form);
  const next = await connection.db.medicalLoan.findFirstOrThrow({where:{returnedAt:null}});
  await returnMedicalDevice(connection.db,f.userId,f.organizationId,next.id);
  await expect(recordMedicalInspection(connection.db,f.userId,f.organizationId,old)).rejects.toThrow();
  expect((await medicalDeviceDetail(connection.db,f.organizationId,f.deviceId))?.returnInspectionPending).toBe(true);
  await recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId,{kind:"POST_RETURN",result:"PASSED"}));
  await lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form);
  expect(await connection.db.medicalLoan.count({where:{returnedAt:null}})).toBe(1);
});
test("点検の越境・無効ユーザー・最新権限を拒否し、MANAGERを許可する", async () => {
  const f = await medicalLoanFixture();
  const form = await inspectionForm(f.deviceId);
  const other = await connection.db.organization.create({data:{code:"inspection-other",name:"外部"}});
  const outsider = await connection.db.user.create({data:{organizationId:other.id,name:"外部",email:"outside@inspection.example",role:"ADMIN"}});
  await expect(recordMedicalInspection(connection.db,outsider.id,other.id,form)).rejects.toThrow();
  await connection.db.user.update({where:{id:f.userId},data:{role:"USER"}});
  await expect(recordMedicalInspection(connection.db,f.userId,f.organizationId,form)).rejects.toMatchObject({status:403});
  await connection.db.user.update({where:{id:f.userId},data:{role:"MANAGER"}});
  await recordMedicalInspection(connection.db,f.userId,f.organizationId,form);
  await connection.db.user.update({where:{id:f.userId},data:{isActive:false}});
  await expect(recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId))).rejects.toMatchObject({status:403});
  expect((await medicalInspectionList(connection.db,other.id,inspectionQuery({}))).total).toBe(0);
});
test("貸出中・廃棄済みの点検を拒否し、停止中の合格で運用を再開しない", async () => {
  const f = await medicalLoanFixture();
  await lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form);
  await expect(recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId,{result:"PASSED"}))).rejects.toThrow();
  const loan = await connection.db.medicalLoan.findFirstOrThrow();await returnMedicalDevice(connection.db,f.userId,f.organizationId,loan.id);
  await expect(recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId,{kind:"POST_RETURN",result:"PASSED",inspectionDate:"2000-01-01"}))).rejects.toThrow();
  await saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,id:f.deviceId,status:"SUSPENDED"}));
  await recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId,{result:"PASSED"}));
  expect((await medicalDeviceDetail(connection.db,f.organizationId,f.deviceId))?.returnInspectionPending).toBe(true);
  expect((await connection.db.medicalInspection.findFirstOrThrow()).clearedPending).toBe(false);
  await saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,id:f.deviceId,status:"RETIRED"}));
  await expect(recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId))).rejects.toThrow();
});
test("同じ点検フォームの同時保存は1件だけ確定する", async () => {
  const f = await medicalLoanFixture(), form = await inspectionForm(f.deviceId,{result:"PASSED"});
  const result = await Promise.allSettled([recordMedicalInspection(connection.db,f.userId,f.organizationId,form),recordMedicalInspection(connection.db,f.userId,f.organizationId,form)]);
  expect(result.filter(x=>x.status === "fulfilled")).toHaveLength(1);
  expect(await connection.db.medicalInspection.count()).toBe(1);
});
test("点検の監査失敗時は点検記録と再貸出許可を全て取り消す", async () => {
  const f = await medicalLoanFixture();
  await recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId,{result:"FAILED"}));
  await connection.pool.query(`CREATE FUNCTION "${schema}".fail_inspection_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END; $$`);
  await connection.pool.query(`CREATE TRIGGER fail_inspection_audit BEFORE INSERT ON "${schema}"."AuditLog" FOR EACH STATEMENT EXECUTE FUNCTION "${schema}".fail_inspection_audit()`);
  await expect(recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId,{result:"PASSED"}))).rejects.toThrow();
  expect(await connection.db.medicalInspection.count()).toBe(1);
  expect((await medicalDeviceDetail(connection.db,f.organizationId,f.deviceId))?.returnInspectionPending).toBe(true);
  const logs = await connection.db.auditLog.findMany({where:{resourceType:"MedicalInspection"}});
  expect(JSON.stringify(logs)).not.toContain("施設の手順に沿った試用確認");
});
test("点検一覧の結果・機器検索・ページ切替は組織内で一致する", async () => {
  const f = await medicalLoanFixture();
  await connection.db.medicalInspection.createMany({data:Array.from({length:12},(_,i)=>({organizationId:f.organizationId,deviceId:f.deviceId,inspectedById:f.userId,inspectionDate:new Date("2026-01-01"),kind:"PERIODIC" as const,result:i===0 ? "FAILED" as const : "PASSED" as const,content:"試用履歴"}))});
  const first = await medicalInspectionList(connection.db,f.organizationId,inspectionQuery({q:"ME-001"}));
  const second = await medicalInspectionList(connection.db,f.organizationId,inspectionQuery({page:"2"}));
  expect(first.rows).toHaveLength(10);expect(second.rows).toHaveLength(2);
  expect(new Set([...first.rows,...second.rows].map(x=>x.id)).size).toBe(12);
  expect((await medicalInspectionList(connection.db,f.organizationId,inspectionQuery({result:"FAILED"}))).total).toBe(1);
  expect((await medicalInspectionList(connection.db,f.organizationId,inspectionQuery({page:"999"}))).page).toBe(2);
});
test("既存8Migrationの台帳・返却・点検待ちを保持して点検を追加する", async () => {
  await mkdir(join(folder,"migrations"),{recursive:true});
  for (const entry of await readdir("prisma/migrations")) {
    if (["20261001110000_medical_inspections","20261001120000_medical_repairs","20261001130000_medical_samples","20261004090000_notifications"].includes(entry)) continue;
    await cp(join("prisma/migrations",entry),join(folder,"migrations",entry),{recursive:true});
  }
  await migrate();expect(await historyCount()).toBe(8);
  const {userId,organizationId} = await seedDevelopment(connection.db,seedEnv);
  const id = randomUUID();
  await connection.pool.query('INSERT INTO "MedicalDevice" (id,"organizationId","managementNumber",name,category,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())',[id,organizationId,"ME-001","以前の機器","ポンプ"]);
  const department = await connection.db.department.findFirstOrThrow();
  await connection.db.medicalLoan.create({data:{deviceId:id,departmentId:department.id,organizationId,loanedById:userId,destinationName:department.name,destinationLocation:"既存の場所"}});
  const loan = await connection.db.medicalLoan.findFirstOrThrow();
  await connection.db.$transaction(async tx=>{
    const after = await tx.medicalLoan.update({where:{id:loan.id},data:{returnedAt:new Date(Date.now()+9*60*60*1000),returnedById:userId}});
    await connection.pool.query('UPDATE "MedicalDevice" SET "returnInspectionPending"=true WHERE id=$1',[id]);
    await appendAuditLog(tx,{id:userId,organizationId},{action:"UPDATE",resourceType:"MedicalLoan",resourceId:loan.id,before:loan,after});
  });
  const original = await connection.db.auditLog.findFirstOrThrow({where:{resourceId:loan.id,action:"UPDATE"}});
  const stored = await connection.db.medicalLoan.findUniqueOrThrow({where:{id:loan.id}});
  await migrateDatabase(url);expect(await historyCount()).toBe(12);
  expect((await medicalDeviceDetail(connection.db,organizationId,id))?.returnInspectionPending).toBe(true);
  expect(await connection.db.medicalLoan.findUniqueOrThrow({where:{id:loan.id}})).toMatchObject({destinationLocation:"既存の場所",returnedAt:stored.returnedAt});
  expect((await medicalLoanList(connection.db,organizationId,loanQuery({state:"returned"}))).rows[0].returnedAt?.toISOString()).toBe(original.timestamp.toISOString());
  expect(await connection.db.auditLog.findUnique({where:{id:original.id}})).toMatchObject({after:original.after});
  await recordMedicalInspection(connection.db,userId,organizationId,await inspectionForm(id,{kind:"POST_RETURN",result:"PASSED"}));
  expect(await connection.db.medicalInspection.count()).toBe(1);
  await lendMedicalDevice(connection.db,userId,organizationId,managementForm({deviceId:id,departmentId:department.id,destinationLocation:"新しい貸出"}));
  const recent = await connection.db.medicalLoan.findFirstOrThrow({where:{returnedAt:null}});
  await returnMedicalDevice(connection.db,userId,organizationId,recent.id);
  await recordMedicalInspection(connection.db,userId,organizationId,await inspectionForm(id,{kind:"POST_RETURN",result:"PASSED"}));
  expect(await connection.db.medicalInspection.count({where:{returnLoanId:recent.id}})).toBe(1);
});

function repairForm(deviceId:string,change:Record<string,string>={}) {
  return managementForm({deviceId,operation:"request",problem:"試用の不具合",confirm:"yes",...change});
}
test("修理依頼から完了・運用再開・合格点検を通して再貸出する", async()=>{
  const f = await medicalLoanFixture();
  await saveMedicalRepair(connection.db,f.userId,f.organizationId,repairForm(f.deviceId));
  const repair = await connection.db.medicalRepair.findFirstOrThrow();
  expect(await connection.db.medicalDevice.findUniqueOrThrow({where:{id:f.deviceId}})).toMatchObject({status:"SUSPENDED",returnInspectionPending:true});
  await expect(lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form)).rejects.toThrow();
  await expect(recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId,{result:"PASSED"}))).rejects.toThrow();
  await expect(saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,id:f.deviceId,status:"IN_SERVICE"}))).rejects.toThrow();
  await expect(saveMedicalRepair(connection.db,f.userId,f.organizationId,repairForm(f.deviceId,{operation:"complete",repairId:repair.id,completionContent:"交換"}))).rejects.toThrow();
  await saveMedicalRepair(connection.db,f.userId,f.organizationId,repairForm(f.deviceId,{operation:"start",repairId:repair.id}));
  await saveMedicalRepair(connection.db,f.userId,f.organizationId,repairForm(f.deviceId,{operation:"complete",repairId:repair.id,completionContent:"部品交換と動作確認"}));
  await expect(saveMedicalRepair(connection.db,f.userId,f.organizationId,repairForm(f.deviceId,{operation:"complete",repairId:repair.id,completionContent:"上書き"}))).rejects.toThrow();
  expect(await connection.db.medicalRepair.findUniqueOrThrow({where:{id:repair.id}})).toMatchObject({status:"COMPLETED",completionContent:"部品交換と動作確認"});
  await expect(recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId,{result:"PASSED",inspectionDate:"2000-01-01"}))).rejects.toThrow();
  await expect(lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form)).rejects.toThrow();
  await recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId,{result:"PASSED"}));
  expect((await medicalDeviceDetail(connection.db,f.organizationId,f.deviceId))?.returnInspectionPending).toBe(true);
  await saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,id:f.deviceId,status:"IN_SERVICE"}));
  await expect(lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form)).rejects.toThrow();
  await recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(f.deviceId,{result:"PASSED"}));
  await lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form);
  const logs = await connection.db.auditLog.findMany({where:{resourceType:"MedicalRepair"}});
  expect(logs).toHaveLength(3);expect(JSON.stringify(logs)).not.toContain("部品交換");expect(JSON.stringify(logs)).not.toContain("試用の不具合");
});
test("修理の越境・最新権限・無効ユーザーと貸出中・廃棄済みの依頼を拒否する", async()=>{
  const f = await medicalLoanFixture(), form = repairForm(f.deviceId);
  const org = await connection.db.organization.create({data:{code:"repair-other",name:"外部"}});
  const other = await connection.db.user.create({data:{organizationId:org.id,name:"外部",email:"outside@repair.example",role:"ADMIN"}});
  await expect(saveMedicalRepair(connection.db,other.id,org.id,form)).rejects.toThrow();
  await connection.db.user.update({where:{id:f.userId},data:{role:"USER"}});
  await expect(saveMedicalRepair(connection.db,f.userId,f.organizationId,form)).rejects.toMatchObject({status:403});
  await connection.db.user.update({where:{id:f.userId},data:{role:"MANAGER"}});
  await lendMedicalDevice(connection.db,f.userId,f.organizationId,f.form);
  await expect(saveMedicalRepair(connection.db,f.userId,f.organizationId,form)).rejects.toThrow();
  await returnMedicalDevice(connection.db,f.userId,f.organizationId,(await connection.db.medicalLoan.findFirstOrThrow()).id);
  await saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,id:f.deviceId,status:"RETIRED"}));
  await expect(saveMedicalRepair(connection.db,f.userId,f.organizationId,form)).rejects.toThrow();
  await saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,id:f.deviceId,status:"SUSPENDED"}));
  await saveMedicalRepair(connection.db,f.userId,f.organizationId,form);
  const repair = await connection.db.medicalRepair.findFirstOrThrow();
  await expect(saveMedicalRepair(connection.db,other.id,org.id,repairForm(f.deviceId,{operation:"start",repairId:repair.id}))).rejects.toThrow();
  await connection.db.user.update({where:{id:f.userId},data:{isActive:false}});
  await expect(saveMedicalRepair(connection.db,f.userId,f.organizationId,repairForm(f.deviceId,{operation:"start",repairId:repair.id}))).rejects.toMatchObject({status:403});
  expect((await medicalRepairList(connection.db,org.id,repairQuery({}))).total).toBe(0);
});
test("同時修理依頼と同時開始は1件だけ確定し、DBでも二重依頼を拒否する", async()=>{
  const f = await medicalLoanFixture(), form = repairForm(f.deviceId);
  const result = await Promise.allSettled([saveMedicalRepair(connection.db,f.userId,f.organizationId,form),saveMedicalRepair(connection.db,f.userId,f.organizationId,form)]);
  expect(result.filter(x=>x.status === "fulfilled")).toHaveLength(1);
  const repair = await connection.db.medicalRepair.findFirstOrThrow();
  await expect(connection.db.medicalRepair.create({data:{organizationId:f.organizationId,deviceId:f.deviceId,reportedById:f.userId,problem:"直接重複"}})).rejects.toThrow();
  const start = repairForm(f.deviceId,{operation:"start",repairId:repair.id});
  const started = await Promise.allSettled([saveMedicalRepair(connection.db,f.userId,f.organizationId,start),saveMedicalRepair(connection.db,f.userId,f.organizationId,start)]);
  expect(started.filter(x=>x.status === "fulfilled")).toHaveLength(1);
  expect(await connection.db.medicalRepair.count()).toBe(1);
});
test("修理監査の失敗時は依頼と運用停止を全て取り消す", async()=>{
  const f = await medicalLoanFixture();
  await connection.pool.query(`CREATE FUNCTION "${schema}".fail_repair_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END; $$`);
  await connection.pool.query(`CREATE TRIGGER fail_repair_audit BEFORE INSERT ON "${schema}"."AuditLog" FOR EACH STATEMENT EXECUTE FUNCTION "${schema}".fail_repair_audit()`);
  await expect(saveMedicalRepair(connection.db,f.userId,f.organizationId,repairForm(f.deviceId))).rejects.toThrow();
  expect(await connection.db.medicalRepair.count()).toBe(0);
  expect(await connection.db.medicalDevice.findUniqueOrThrow({where:{id:f.deviceId}})).toMatchObject({status:"IN_SERVICE",returnInspectionPending:false});
});
test("修理一覧の機器検索・状態・ページ切替は組織内で一致する", async()=>{
  const f = await medicalLoanFixture();
  const now = new Date();
  await connection.db.medicalRepair.createMany({data:Array.from({length:12},(_,i)=>({organizationId:f.organizationId,deviceId:f.deviceId,reportedById:f.userId,status:i === 0 ? "REQUESTED" as const : "COMPLETED" as const,problem:"試用",reportedAt:now,startedAt:i === 0 ? null : now,completedAt:i === 0 ? null : now,completionContent:i === 0 ? null : "試用完了"}))});
  const first = await medicalRepairList(connection.db,f.organizationId,repairQuery({q:"ME-001"}));
  const second = await medicalRepairList(connection.db,f.organizationId,repairQuery({page:"2"}));
  expect(first.rows).toHaveLength(10);expect(second.rows).toHaveLength(2);
  expect(new Set([...first.rows,...second.rows].map(x=>x.id)).size).toBe(12);
  expect((await medicalRepairList(connection.db,f.organizationId,repairQuery({status:"REQUESTED"}))).total).toBe(1);
  expect((await medicalRepairList(connection.db,f.organizationId,repairQuery({page:"999"}))).page).toBe(2);
});
test("既存9Migrationの機器・点検・監査を保持して修理を追加する",async()=>{
  await mkdir(join(folder,"migrations"),{recursive:true});
  for (const entry of await readdir("prisma/migrations")) {
    if (["20261001120000_medical_repairs","20261001130000_medical_samples","20261004090000_notifications"].includes(entry)) continue;
    await cp(join("prisma/migrations",entry),join(folder,"migrations",entry),{recursive:true});
  }
  await migrate();expect(await historyCount()).toBe(9);
  const {userId,organizationId} = await seedDevelopment(connection.db,seedEnv);
  const deviceId = randomUUID();
  await connection.pool.query('INSERT INTO "MedicalDevice" (id,"organizationId","managementNumber",name,category,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())',[deviceId,organizationId,"ME-001","以前の機器","ポンプ"]);
  await connection.db.medicalInspection.create({data:{deviceId,organizationId,inspectedById:userId,kind:"PERIODIC",result:"PASSED",content:"既存の点検",inspectionDate:new Date(todayInJapan())}});
  const before = (await connection.pool.query('SELECT * FROM "MedicalDevice" WHERE id=$1',[deviceId])).rows[0];
  const inspections = await connection.db.medicalInspection.findMany();const audits = await connection.db.auditLog.findMany({orderBy:{id:"asc"}});
  await migrateDatabase(url);expect(await historyCount()).toBe(12);
  const upgraded = (await connection.pool.query('SELECT * FROM "MedicalDevice" WHERE id=$1',[deviceId])).rows[0];
  expect(upgraded).toEqual({...before,isSample:false});
  expect(await connection.db.medicalInspection.findMany()).toEqual(inspections);
  expect(await connection.db.auditLog.findMany({orderBy:{id:"asc"}})).toEqual(audits);
  await saveMedicalRepair(connection.db,userId,organizationId,repairForm(deviceId));
  expect(await connection.db.medicalRepair.count()).toBe(1);
});

test("テストデータは任意の7台と運用履歴を一度だけ追加し既存機器を保持する",async()=>{
  const f = await medicalLoanFixture();
  const before = await connection.db.medicalDevice.findUniqueOrThrow({where:{id:f.deviceId}});
  expect(await createMedicalSamples(connection.db,f.userId,f.organizationId)).toBe(true);
  expect(await createMedicalSamples(connection.db,f.userId,f.organizationId)).toBe(false);
  expect(await connection.db.medicalDevice.findUniqueOrThrow({where:{id:f.deviceId}})).toEqual(before);
  expect(await connection.db.medicalDevice.count({where:{isSample:true}})).toBe(7);
  expect((await medicalDeviceList(connection.db,f.organizationId,medicalQuery({}),false)).total).toBe(1);
  expect((await medicalDeviceList(connection.db,f.organizationId,medicalQuery({}),true)).total).toBe(8);
  expect((await medicalLoanList(connection.db,f.organizationId,loanQuery({}),false)).total).toBe(0);
  expect((await medicalLoanList(connection.db,f.organizationId,loanQuery({}),true)).total).toBe(1);
  expect((await medicalInspectionList(connection.db,f.organizationId,inspectionQuery({}),false)).total).toBe(0);
  expect((await medicalRepairList(connection.db,f.organizationId,repairQuery({}),false)).total).toBe(0);
  const ready = await connection.db.medicalDevice.findFirstOrThrow({where:{managementNumber:"KUMUNO-DEMO-01"}});
  await lendMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({deviceId:ready.id,departmentId:f.departmentId,destinationLocation:"試用"}));
  await createMedicalSamples(connection.db,f.userId,f.organizationId);
  expect(await connection.db.medicalLoan.count({where:{deviceId:ready.id,returnedAt:null}})).toBe(1);
});
test("テストデータの準備は最新権限・有効状態・組織を検査する",async()=>{
  const f=await medicalLoanFixture();
  await connection.db.user.update({where:{id:f.userId},data:{role:"USER"}});
  await expect(createMedicalSamples(connection.db,f.userId,f.organizationId)).rejects.toMatchObject({status:403});
  await connection.db.user.update({where:{id:f.userId},data:{role:"MANAGER"}});
  const other=await connection.db.organization.create({data:{code:"sample-other",name:"外部"}});
  await expect(createMedicalSamples(connection.db,f.userId,other.id)).rejects.toMatchObject({status:403});
  await createMedicalSamples(connection.db,f.userId,f.organizationId);
  expect((await medicalDeviceList(connection.db,other.id,medicalQuery({}),true)).total).toBe(0);
  await connection.db.user.update({where:{id:f.userId},data:{isActive:false}});
  await expect(createMedicalSamples(connection.db,f.userId,f.organizationId)).rejects.toMatchObject({status:403});
});
test("テストデータの番号競合は途中の架空機器と準備印も全て取り消す",async()=>{
  const f=await medicalLoanFixture();
  await saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,managementNumber:"KUMUNO-DEMO-04"}));
  await expect(createMedicalSamples(connection.db,f.userId,f.organizationId)).rejects.toThrow();
  expect(await connection.db.medicalDevice.count()).toBe(2);
  expect(await connection.db.medicalSampleDataset.count()).toBe(0);
  expect(await connection.db.medicalLoan.count()).toBe(0);
  expect(await connection.db.medicalInspection.count()).toBe(0);
});
test("テストデータの監査失敗・同時準備で半端なデータや重複を残さない",async()=>{
  const f=await medicalLoanFixture();
  await connection.pool.query(`CREATE FUNCTION "${schema}".fail_sample_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END; $$`);
  await connection.pool.query(`CREATE TRIGGER fail_sample_audit BEFORE INSERT ON "${schema}"."AuditLog" FOR EACH STATEMENT EXECUTE FUNCTION "${schema}".fail_sample_audit()`);
  await expect(createMedicalSamples(connection.db,f.userId,f.organizationId)).rejects.toThrow();
  expect(await connection.db.medicalSampleDataset.count()).toBe(0);expect(await connection.db.medicalDevice.count()).toBe(1);
  await connection.pool.query(`DROP TRIGGER fail_sample_audit ON "${schema}"."AuditLog"`);
  await Promise.allSettled([createMedicalSamples(connection.db,f.userId,f.organizationId),createMedicalSamples(connection.db,f.userId,f.organizationId)]);
  expect(await connection.db.medicalSampleDataset.count()).toBe(1);expect(await connection.db.medicalDevice.count({where:{isSample:true}})).toBe(7);
});

test("医療ダッシュボードの台数と遷移先一覧・テストデータ設定が一致する",async()=>{
  const f=await medicalLoanFixture();await createMedicalSamples(connection.db,f.userId,f.organizationId);
  const overview=await medicalOverview(connection.db,f.organizationId,true);
  expect(overview.total).toBe(8);
  expect(overview.counts).toEqual({ready:2,loaned:1,pending:3,repair:1,suspended:0,retired:1});
  expect(Object.values(overview.counts).reduce((a,b)=>a+b,0)).toBe(overview.total);
  for (const [availability,count] of Object.entries(overview.counts)) expect((await medicalDeviceList(connection.db,f.organizationId,medicalQuery({availability}),true)).total).toBe(count);
  const actual=await medicalOverview(connection.db,f.organizationId,false);expect(actual.total).toBe(1);expect(actual.counts.ready).toBe(1);expect(actual.upcoming).toHaveLength(0);
  const org=await connection.db.organization.create({data:{code:"overview-other",name:"外部"}});
  expect((await medicalOverview(connection.db,org.id,true)).total).toBe(0);
});
test("点検予定は直近記録のみで判定し、予定未入力・廃棄済みを除く",async()=>{
  const f=await medicalLoanFixture();await createMedicalSamples(connection.db,f.userId,f.organizationId);
  const first=await medicalOverview(connection.db,f.organizationId,true);
  expect(first.dueTotal).toBe(2);expect(first.overdue).toBe(1);
  const failed=await connection.db.medicalDevice.findFirstOrThrow({where:{managementNumber:"KUMUNO-DEMO-04"}});
  await recordMedicalInspection(connection.db,f.userId,f.organizationId,await inspectionForm(failed.id,{result:"PASSED",nextInspectionDate:""}));
  const updated=await medicalOverview(connection.db,f.organizationId,true);
  expect(updated.dueTotal).toBe(1);expect(updated.overdue).toBe(0);expect(updated.upcoming.map(d=>d.id)).not.toContain(failed.id);
  const ready=await connection.db.medicalDevice.findFirstOrThrow({where:{managementNumber:"KUMUNO-DEMO-01"}});
  await saveMedicalDevice(connection.db,f.userId,f.organizationId,managementForm({...medicalFields,id:ready.id,managementNumber:ready.managementNumber,status:"RETIRED"}));
  expect((await medicalOverview(connection.db,f.organizationId,true)).dueTotal).toBe(0);
});

test("医療CSVは全ページの検索・テスト選択を反映し、別組織と備考を含めない", async()=>{
  const f=await medicalLoanFixture();
  await createMedicalSamples(connection.db,f.userId,f.organizationId);
  const org=await connection.db.organization.create({data:{code:"csv-other",name:"外部"}});
  await connection.db.medicalDevice.create({data:{organizationId:org.id,managementNumber:"OUTSIDE",name:"外部の機器",category:"輸液ポンプ"}});
  await connection.db.medicalDevice.update({where:{id:f.deviceId},data:{notes:"CSVに出してはいけない備考"}});
  const auditBefore=await connection.db.auditLog.count();
  const actual=parseCsv(await exportMedicalDevices(connection.db,f.organizationId,medicalQuery({page:"999"}),false));
  expect(actual).toHaveLength(2);expect(actual[0]).toEqual(medicalCsvHeaders);
  const all=parseCsv(await exportMedicalDevices(connection.db,f.organizationId,medicalQuery({}),true));
  expect(all).toHaveLength(9);expect(all.flat()).not.toContain("OUTSIDE");expect(all.flat()).not.toContain("CSVに出してはいけない備考");
  const query=medicalQuery({availability:"loaned"});
  expect(parseCsv(await exportMedicalDevices(connection.db,f.organizationId,query,true)).length-1).toBe((await medicalDeviceList(connection.db,f.organizationId,query,true)).total);
  expect(parseCsv(await exportMedicalDevices(connection.db,f.organizationId,medicalQuery({q:"存在しない機器"}),true))).toEqual([medicalCsvHeaders]);
  expect(await connection.db.auditLog.count()).toBe(auditBefore);
});
test("医療CSVは1000台超を切り捨てず拒否し、条件を絞れば出力できる",async()=>{
  const f=await medicalLoanFixture();
  await connection.db.medicalDevice.createMany({data:Array.from({length:1000},(_,i)=>({organizationId:f.organizationId,managementNumber:`CSV-${String(i).padStart(4,"0")}`,name:"CSV上限確認",category:"輸液ポンプ"}))});
  await expect(exportMedicalDevices(connection.db,f.organizationId,medicalQuery({}),false)).rejects.toMatchObject({code:"MAX_DEVICES"});
  const selected=parseCsv(await exportMedicalDevices(connection.db,f.organizationId,medicalQuery({q:"CSV-0000"}),false));
  expect(selected).toHaveLength(2);expect(selected[1][0]).toBe("CSV-0000");
});
test("医療CSVは数式の可能性がある属性を拒否し、業務データを変えない",async()=>{
  const f=await medicalLoanFixture();
  const before=await connection.db.medicalDevice.update({where:{id:f.deviceId},data:{manufacturer:"  ＝1+1"}});
  const audits=await connection.db.auditLog.count();
  await expect(exportMedicalDevices(connection.db,f.organizationId,medicalQuery({}),false)).rejects.toMatchObject({code:"FORMULA_PREFIX",row:2,column:5});
  expect(await connection.db.medicalDevice.findUniqueOrThrow({where:{id:f.deviceId}})).toEqual(before);
  expect(await connection.db.auditLog.count()).toBe(audits);
});

const importCsv="機器管理番号,機器名,種別\nIMPORT-001,一括輸液ポンプ,輸液ポンプ\nIMPORT-002,一括シリンジポンプ,シリンジポンプ\n";
const importSecret="test-only-medical-import-secret-32-characters";
test("医療CSVの確認は書き込まず、全件と監査を同時登録して点検待ちにする",async()=>{
  const f=await medicalLoanFixture();const before=await connection.db.medicalDevice.count(),audits=await connection.db.auditLog.count();
  const preview=await previewMedicalImport(connection.db,f.userId,f.organizationId,importCsv);expect(preview.errors).toEqual([]);
  expect(await connection.db.medicalDevice.count()).toBe(before);
  const token=issueImportToken(importSecret,f.userId,f.organizationId,preview.digest);
  expect(await importMedicalDevices(connection.db,f.userId,f.organizationId,importCsv,token,importSecret)).toBe(2);
  const added=await connection.db.medicalDevice.findMany({where:{managementNumber:{startsWith:"IMPORT-"}}});
  expect(added).toHaveLength(2);expect(added.every(d=>d.returnInspectionPending&&!d.isSample)).toBe(true);expect(await connection.db.auditLog.count()).toBe(audits+3);
  await expect(importMedicalDevices(connection.db,f.userId,f.organizationId,importCsv,token,importSecret)).rejects.toThrow();
  expect(await connection.db.medicalDevice.count()).toBe(before+2);
});
test("医療CSVはファイル内重複・既存番号・部署の不一致と曖昧な名前を確認画面に示す",async()=>{
  const f=await medicalLoanFixture();
  const number=(await connection.db.medicalDevice.findUniqueOrThrow({where:{id:f.deviceId}})).managementNumber;
  const csv=`機器管理番号,機器名,種別,所属部署コード\n${number},重複,輸液ポンプ,存在しない部署\nX,機器,輸液ポンプ,\nX,重複,輸液ポンプ,\n`;
  expect((await previewMedicalImport(connection.db,f.userId,f.organizationId,csv)).errors.length).toBeGreaterThan(1);
  await connection.db.department.createMany({data:[{organizationId:f.organizationId,code:"AMB-A",name:"同名部署"},{organizationId:f.organizationId,code:"AMB-B",name:"同名部署"}]});
  const ambiguous="機器管理番号,機器名,種別,所属部署\nAMB-1,機器,輸液ポンプ,同名部署";
  expect((await previewMedicalImport(connection.db,f.userId,f.organizationId,ambiguous)).errors).toHaveLength(1);
  const code="機器管理番号,機器名,種別,所属部署コード\nAMB-1,機器,輸液ポンプ,AMB-A";
  expect((await previewMedicalImport(connection.db,f.userId,f.organizationId,code)).errors).toEqual([]);
  expect(await connection.db.medicalDevice.count()).toBe(1);
});
test("医療CSVは確認の改ざん・期限切れ・別担当者と最新の降格を拒否する",async()=>{
  const f=await medicalLoanFixture();const preview=await previewMedicalImport(connection.db,f.userId,f.organizationId,importCsv);
  const token=issueImportToken(importSecret,f.userId,f.organizationId,preview.digest);
  for(const invalid of [token+"x",issueImportToken(importSecret,f.userId,f.organizationId,preview.digest,Date.now()-700000),issueImportToken(importSecret,randomUUID(),f.organizationId,preview.digest)])await expect(importMedicalDevices(connection.db,f.userId,f.organizationId,importCsv,invalid,importSecret)).rejects.toThrow();
  await expect(importMedicalDevices(connection.db,f.userId,f.organizationId,importCsv.replace("IMPORT-001","CHANGED"),token,importSecret)).rejects.toThrow();
  await connection.db.user.update({where:{id:f.userId},data:{role:"USER"}});
  await expect(importMedicalDevices(connection.db,f.userId,f.organizationId,importCsv,token,importSecret)).rejects.toMatchObject({status:403});
  expect(await connection.db.medicalDevice.count()).toBe(1);
});
test("医療CSVの途中の監査失敗では先行行を含めて全体を取り消す",async()=>{
  const f=await medicalLoanFixture();const preview=await previewMedicalImport(connection.db,f.userId,f.organizationId,importCsv),audits=await connection.db.auditLog.count();
  await connection.pool.query(`CREATE FUNCTION "${schema}".fail_import_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM "${schema}"."MedicalDevice" WHERE "managementNumber"='IMPORT-002') THEN RAISE EXCEPTION 'test failure'; END IF; RETURN NEW; END; $$`);
  await connection.pool.query(`CREATE TRIGGER fail_import_audit BEFORE INSERT ON "${schema}"."AuditLog" FOR EACH ROW EXECUTE FUNCTION "${schema}".fail_import_audit()`);
  await expect(importMedicalDevices(connection.db,f.userId,f.organizationId,importCsv,issueImportToken(importSecret,f.userId,f.organizationId,preview.digest),importSecret)).rejects.toThrow();
  expect(await connection.db.medicalDevice.count()).toBe(1);expect(await connection.db.auditLog.count()).toBe(audits);
});
test("同じCSVの同時登録は一方だけが全件を保存する",async()=>{
  const f=await medicalLoanFixture(),preview=await previewMedicalImport(connection.db,f.userId,f.organizationId,importCsv);
  const token=issueImportToken(importSecret,f.userId,f.organizationId,preview.digest);
  const results=await Promise.allSettled([importMedicalDevices(connection.db,f.userId,f.organizationId,importCsv,token,importSecret),importMedicalDevices(connection.db,f.userId,f.organizationId,importCsv,token,importSecret)]);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(await connection.db.medicalDevice.count()).toBe(3);
});

test("CSV登録完了を本人へ一件通知し、既読は初回時刻を保持して監査する",async()=>{
  const f=await medicalLoanFixture(),preview=await previewMedicalImport(connection.db,f.userId,f.organizationId,importCsv);
  await importMedicalDevices(connection.db,f.userId,f.organizationId,importCsv,issueImportToken(importSecret,f.userId,f.organizationId,preview.digest),importSecret);
  const notification=await connection.db.notification.findFirstOrThrow();expect(notification.recipientId).toBe(f.userId);expect(notification.organizationId).toBe(f.organizationId);expect(notification.readAt).toBeNull();
  expect(await unreadNotificationCount(connection.db,f.organizationId,f.userId)).toBe(1);
  const concurrent=await Promise.allSettled([markNotificationRead(connection.db,f.userId,f.organizationId,notification.id),markNotificationRead(connection.db,f.userId,f.organizationId,notification.id)]);
  expect(concurrent.some(r=>r.status==="fulfilled")).toBe(true);
  for(const r of concurrent)if(r.status==="rejected")expect(databaseErrorCode(r.reason)).toBe("P2034");
  expect(await connection.db.auditLog.count({where:{resourceId:notification.id,action:"UPDATE"}})).toBe(1);
  const read=await connection.db.notification.findUniqueOrThrow({where:{id:notification.id}});expect(read.readAt).not.toBeNull();
  const audit=await connection.db.auditLog.findFirstOrThrow({where:{resourceType:"Notification",action:"UPDATE"}});expect(audit.after).not.toHaveProperty("message");expect(audit.after).not.toHaveProperty("title");
  const before=await connection.db.auditLog.count();await markNotificationRead(connection.db,f.userId,f.organizationId,notification.id);
  expect(await connection.db.auditLog.count()).toBe(before);expect((await connection.db.notification.findUniqueOrThrow({where:{id:notification.id}})).readAt).toEqual(read.readAt);
});
test("他の受信者・別組織の通知は読めず既読にもできず、無効ユーザーを拒否する",async()=>{
  const f=await medicalLoanFixture(),other=await connection.db.user.create({data:{organizationId:f.organizationId,email:"other@notification.example",name:"別担当",role:"ADMIN"}});
  const notice=await connection.db.notification.create({data:{organizationId:f.organizationId,recipientId:other.id,key:"other",title:"非公開",message:"別担当者の通知",href:"/dashboard"}});
  expect((await notificationList(connection.db,f.organizationId,f.userId,false,1)).total).toBe(0);
  await expect(markNotificationRead(connection.db,f.userId,f.organizationId,notice.id)).rejects.toThrow();
  const org=await connection.db.organization.create({data:{code:"notif-other",name:"別組織"}});
  await expect(markNotificationRead(connection.db,f.userId,org.id,notice.id)).rejects.toMatchObject({status:403});
  await expect(connection.db.notification.create({data:{organizationId:org.id,recipientId:f.userId,key:"invalid",title:"越境",message:"不正",href:"/dashboard"}})).rejects.toThrow();
  await connection.db.user.update({where:{id:other.id},data:{role:"USER"}});
  await markNotificationRead(connection.db,other.id,f.organizationId,notice.id);
  await connection.db.user.update({where:{id:other.id},data:{isActive:false}});
  await expect(markNotificationRead(connection.db,other.id,f.organizationId,notice.id)).rejects.toMatchObject({status:403});
});
test("通知の保存失敗ではCSVの全件と監査を取り消す",async()=>{
  const f=await medicalLoanFixture(),preview=await previewMedicalImport(connection.db,f.userId,f.organizationId,importCsv),audits=await connection.db.auditLog.count();
  await connection.pool.query(`CREATE FUNCTION "${schema}".fail_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END; $$`);
  await connection.pool.query(`CREATE TRIGGER fail_notification BEFORE INSERT ON "${schema}"."Notification" FOR EACH STATEMENT EXECUTE FUNCTION "${schema}".fail_notification()`);
  await expect(importMedicalDevices(connection.db,f.userId,f.organizationId,importCsv,issueImportToken(importSecret,f.userId,f.organizationId,preview.digest),importSecret)).rejects.toThrow();
  expect(await connection.db.medicalDevice.count()).toBe(1);expect(await connection.db.notification.count()).toBe(0);expect(await connection.db.auditLog.count()).toBe(audits);
});
test("既読の監査失敗では未読を維持し、一意キーと受信者削除規則を守る",async()=>{
  const f=await medicalLoanFixture();const data={organizationId:f.organizationId,recipientId:f.userId,key:"dedupe",title:"通知",message:"本文",href:"/dashboard"};
  const notice=await connection.db.notification.create({data});await expect(connection.db.notification.create({data})).rejects.toThrow();
  await connection.pool.query(`CREATE FUNCTION "${schema}".fail_read_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."resourceType"='Notification' THEN RAISE EXCEPTION 'test failure'; END IF; RETURN NEW; END; $$`);
  await connection.pool.query(`CREATE TRIGGER fail_read_audit BEFORE INSERT ON "${schema}"."AuditLog" FOR EACH ROW EXECUTE FUNCTION "${schema}".fail_read_audit()`);
  await expect(markNotificationRead(connection.db,f.userId,f.organizationId,notice.id)).rejects.toThrow();expect((await connection.db.notification.findUniqueOrThrow({where:{id:notice.id}})).readAt).toBeNull();
  const user=await connection.db.user.create({data:{organizationId:f.organizationId,email:"delete@notification.example",name:"削除用"}});
  const removable=await connection.db.notification.create({data:{...data,recipientId:user.id}});await connection.db.user.delete({where:{id:user.id}});expect(await connection.db.notification.findUnique({where:{id:removable.id}})).toBeNull();
});
test("自分の通知を20件ずつ表示し、未読絞込みと人数境界を保つ",async()=>{
  const f=await medicalLoanFixture();await connection.db.notification.createMany({data:Array.from({length:21},(_,i)=>({organizationId:f.organizationId,recipientId:f.userId,key:`page-${i}`,title:"通知",message:"本文",href:"/dashboard",readAt:i===0?new Date():null}))});
  const first=await notificationList(connection.db,f.organizationId,f.userId,false,1),second=await notificationList(connection.db,f.organizationId,f.userId,false,2);
  expect(first.rows).toHaveLength(20);expect(second.rows).toHaveLength(1);expect(first.unread).toBe(20);expect(new Set([...first.rows,...second.rows].map(n=>n.id)).size).toBe(21);
  expect((await notificationList(connection.db,f.organizationId,f.userId,true,1)).total).toBe(20);
});
