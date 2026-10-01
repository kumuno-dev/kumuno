import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, mkdir, writeFile, symlink, rm, realpath } from 'node:fs/promises';
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
  for (const args of [['../escape'], ['/tmp/escape'], ['CON'], ['con'], ['app', '--unknown'], ['app','--install','--no-install'], ['app','--yes','--no-install'], ['--yes'], []]) assert.notEqual(run(...args).status, 0);
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

test('非対話の既定は生成だけで、helpは出力先を作らない', async t => {
  const { cwd, run } = await fixture(t);
  assert.equal(run('--help').status,0);
  assert.deepEqual(await readdir(cwd),[]);
  assert.equal(run('noninteractive').status,0);
  assert(!(await readdir(join(cwd,'noninteractive'))).includes('node_modules'));
});
test('依存導入は生成先でnpm ciを呼び、失敗時も生成物を保持する', async t => {
  const { cwd } = await fixture(t);
  const npm = join(cwd,'test npm.mjs');
  await writeFile(npm, `import {writeFileSync} from 'node:fs'; writeFileSync('install-call.json',JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()})); process.exit(Number(process.env.KUMUNO_TEST_EXIT??0));`);
  for(const [name,option,exit] of [['installed','--install',0],['yes-app','--yes',0],['failed','--install',42]]) {
    const result=spawnSync(process.execPath,[cli,name,option],{cwd,encoding:'utf8',env:{...process.env,npm_execpath:npm,KUMUNO_TEST_EXIT:String(exit)}});
    assert.equal(result.status,exit===0?0:1,result.stderr);
    assert.deepEqual(JSON.parse(await readFile(join(cwd,name,'install-call.json'))),{args:['ci','--include=dev'],cwd:await realpath(join(cwd,name))});
    assert.equal(JSON.parse(await readFile(join(cwd,name,'package.json'))).name,name);
    if(exit!==0) assert.match(result.stderr,/生成済みファイルは保持/);
  }
});
