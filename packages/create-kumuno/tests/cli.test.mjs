import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
async function fixture(t) {
  const cwd = await mkdtemp(join(tmpdir(), 'kumuno-cli-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  return { cwd, run: (...args) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' }) };
}
test('生成物の名前・lockを揃え、秘密情報や生成キャッシュを含めない', async t => {
  const { cwd, run } = await fixture(t);
  const result = run('sample-app', '--no-install');
  assert.equal(result.status, 0, result.stderr);
  const app = join(cwd, 'sample-app');
  const pkg = JSON.parse(await readFile(join(app, 'package.json')));
  const lock = JSON.parse(await readFile(join(app, 'package-lock.json')));
  assert.equal(pkg.name, 'sample-app'); assert.equal(lock.packages[''].name, pkg.name);
  const entries = await readdir(app, { recursive: true });
  assert(entries.includes('.env.example'));
  assert(entries.includes('AGENTS.md'));
  assert(!entries.some(p => /(^|\/)(node_modules|generated|\.git|\.next|\.env.local|\.env.test.local)(\/|$)/.test(p)));
});
test('パス越境・不正名・不明オプション・引数不足を拒否する', async t => {
  const { cwd, run } = await fixture(t);
  for (const args of [['../escape'], ['/tmp/escape'], ['CON'], ['con'], ['app', '--unknown'], []]) assert.notEqual(run(...args).status, 0);
  assert.deepEqual(await readdir(cwd), []);
});
test('既存ディレクトリとsymlinkを上書きしない', async t => {
  const { cwd, run } = await fixture(t);
  await mkdir(join(cwd, 'existing')); await writeFile(join(cwd, 'existing/keep'), 'keep');
  await symlink(join(cwd, 'existing'), join(cwd, 'linked'), 'dir');
  assert.notEqual(run('existing').status, 0); assert.notEqual(run('linked').status, 0);
  assert.equal(await readFile(join(cwd, 'existing/keep'), 'utf8'), 'keep');
  assert.deepEqual(await readdir(join(cwd, 'existing')), ['keep']);
});
