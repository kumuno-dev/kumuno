import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { checkApplicationDocumentation } from './check-application-docs.mjs';
import { requireTestDatabaseUrl, verifyGeneratedDatabase } from './verify-generated-database.mjs';

const databaseMode = process.argv.includes('--db');
const testUrl = databaseMode ? requireTestDatabaseUrl(process.env.TEST_DATABASE_URL) : undefined;
const npm = process.env.npm_execpath;
assert(npm, 'Run npm run test:acceptance or test:acceptance:db.');
const directory = await mkdtemp(join(tmpdir(), 'kumuno-training-'));
const app = join(directory, 'acceptance-app');
const patch = fileURLToPath(new URL('../examples/training-acceptance/training.patch', import.meta.url));
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', npm_config_cache: join(directory, 'npm-cache') };
for (const key of ['DATABASE_URL', 'TEST_DATABASE_URL', 'SHADOW_DATABASE_URL', 'NODE_PATH', 'SEED_ALLOW_DEVELOPMENT', 'SEED_ADMIN_PASSWORD', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'AUTH_TRUSTED_IP_HEADER']) delete env[key];
function run(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, env, stdio: 'inherit' });
  assert.equal(result.status, 0, 'Training acceptance command failed.');
}
try {
  // Fixed published RC: this patch is acceptance evidence for that exact template.
  run([npm, 'exec', '--yes', '--registry=https://registry.npmjs.org/', '--package=create-kumuno@0.1.0-rc.0', '--', 'create-kumuno', 'acceptance-app', '--no-install'], directory);
  for (const args of [['apply', '--check', patch], ['apply', patch]]) {
    const result = spawnSync('git', args, { cwd: app, stdio: 'inherit' });
    assert.equal(result.status, 0, 'Training patch must apply to the published RC.');
  }
  assert(!/equipment/i.test((await readFile(join(app, 'src/training/service.ts'), 'utf8')) + (await readFile(join(app, 'src/training/repository.ts'), 'utf8'))), 'Training must not depend on Equipment.');
  await checkApplicationDocumentation(app);
  run([npm, 'ci'], app);
  run([npm, 'run', 'check'], app);
  if (databaseMode) await verifyGeneratedDatabase(app, testUrl, npm, run);
  await rm(directory, { recursive: true, force: true });
  console.log(`Training acceptance passed: published RC generation, independent patch, application check${databaseMode ? ', migration/seed repeatability, real DB and three-viewport browser regression' : ''}.`);
} catch {
  console.error(`Training acceptance failed. Credential-free fixture retained: ${directory}`);
  process.exitCode = 1;
}
