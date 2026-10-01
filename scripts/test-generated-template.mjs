import { checkApplicationDocumentation } from './check-application-docs.mjs';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

// Run through npm so its platform-specific executable path is available.
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run npm run test:template.');
const databaseMode = process.argv.includes('--db');
let testUrl;
if (databaseMode) {
  try {
    testUrl = new URL(process.env.TEST_DATABASE_URL);
    assert(['postgresql:', 'postgres:'].includes(testUrl.protocol));
    assert(testUrl.hostname && testUrl.username && testUrl.pathname.endsWith('_test'));
    assert(!testUrl.hash && !/[\r\n]/.test(process.env.TEST_DATABASE_URL));
  } catch { throw new Error('TEST_DATABASE_URLに_testで終わる専用PostgreSQL DBを指定してください。'); }
}
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
    const require = createRequire(join(app, 'package.json'));
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: testUrl.toString(), connectionTimeoutMillis: 5000 });
    const schema = `kumuno_generated_${randomUUID().replaceAll('-', '')}`;
    let created = false;
    try {
      await pool.query(`CREATE SCHEMA "${schema}"`);
      created = true;
      const isolated = new URL(testUrl);
      isolated.searchParams.set('schema', schema);
      // Exercise the same files as the generated README, not inherited env vars.
      await writeFile(join(app, '.env.local'), `DATABASE_URL=${JSON.stringify(isolated.toString())}\nSEED_ALLOW_DEVELOPMENT=true\nSEED_ADMIN_PASSWORD=${randomUUID()}\n`, { mode: 0o600 });
      await writeFile(join(app, '.env.test.local'), `TEST_DATABASE_URL=${JSON.stringify(testUrl.toString())}\n`, { mode: 0o600 });
      run([npm, 'run', 'db:check'], app);
      run([npm, 'run', 'db:migrate'], app);
      const count = async () => (await pool.query(`SELECT count(*)::int AS count FROM "${schema}"._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`)).rows[0].count;
      const first = await count();
      assert(first > 0);
      run([npm, 'run', 'db:migrate'], app);
      assert.equal(await count(), first);
      run([npm, 'run', 'db:seed'], app);
      const initial = (await pool.query(`SELECT id FROM "${schema}"."User"`)).rows;
      assert.equal(initial.length, 1);
      run([npm, 'run', 'db:seed'], app);
      assert.deepEqual((await pool.query(`SELECT id FROM "${schema}"."User"`)).rows, initial);
      run([npm, 'run', 'test:db'], app);
      run([npm, 'run', 'test:auth'], app);
    } finally {
      // Do not leave credentials in a failed generated fixture.
      await rm(join(app, '.env.local'), { force: true });
      await rm(join(app, '.env.test.local'), { force: true });
      try { if (created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await pool.end(); }
    }
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
