import { checkApplicationDocumentation } from './check-application-docs.mjs';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { requireTestDatabaseUrl, verifyGeneratedDatabase } from './verify-generated-database.mjs';

// Run through npm so its platform-specific executable path is available.
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run npm run test:template.');
const databaseMode = process.argv.includes('--db');
const testUrl = databaseMode ? requireTestDatabaseUrl(process.env.TEST_DATABASE_URL) : undefined;
const cli = fileURLToPath(new URL('../packages/create-kumuno/src/cli.mjs', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'kumuno-generated-'));
const app = join(temporary, 'generated-app');
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
// A generated app must build without inheriting the developer's DB secrets.
for (const key of ['DATABASE_URL', 'TEST_DATABASE_URL', 'SHADOW_DATABASE_URL', 'NODE_PATH', 'SEED_ALLOW_DEVELOPMENT', 'SEED_ADMIN_PASSWORD', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'AUTH_TRUSTED_IP_HEADER']) delete env[key];
function run(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Verification failed (exit ${result.status}).`);
}
try {
  run([cli, 'generated-app', '--no-install'], temporary);
  const entries = await readdir(app, { recursive: true });
  assert(!entries.some(path => /(^|[\\/])(node_modules|\.git|\.next|generated|\.env\.local|\.env\.test\.local)([\\/]|$)/.test(path)));
  for (const path of entries.filter(path => path.endsWith('.md'))) {
    const document = await readFile(join(app, path), 'utf8');
    assert(!document.includes('docs/master-spec.md'), 'Product development instructions must not leak into the application');
  }
  await checkApplicationDocumentation(app);
  run([npm, 'ci'], app);
  if (databaseMode) {
    await verifyGeneratedDatabase(app, testUrl, npm, run);
  } else {
    run([npm, 'run', 'check'], app);
  }
  // check includes the production build and desktop/mobile browser smoke tests.
  await rm(temporary, { recursive: true, force: true });
  console.log(databaseMode ? 'Generated application: env-file connection, migration, repeat migration and DB integration tests passed.' : 'Generated application: clean install, lint, typecheck, unit tests, production build and browser tests passed.');
} catch (error) {
  console.error(databaseMode ? '生成アプリのDB検証に失敗しました。専用DBの接続・権限を確認してください。' : error.message);
  console.error(`失敗した生成物を確認用に残しました: ${app}`);
  process.exitCode = 1;
}
