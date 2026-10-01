import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

// Reject unsafe configuration before packing or installing; no DATABASE_URL fallback.
export function requireTestDatabaseUrl(value) {
  let testUrl;
  try {
    testUrl = new URL(value);
    assert(['postgresql:', 'postgres:'].includes(testUrl.protocol));
    assert(testUrl.hostname && testUrl.username && testUrl.pathname.endsWith('_test'));
    assert(!testUrl.hash && !/[\r\n]/.test(value));
  } catch { throw new Error('TEST_DATABASE_URLに_testで終わる専用PostgreSQL DBを指定してください。'); }
  return testUrl;
}

// Commands receive no credentials; settings use mode-0600 files, removed on failure.
export async function verifyGeneratedDatabase(app, testUrl, npm, run) {
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
}
