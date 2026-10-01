import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { checkApplicationDocumentation } from './check-application-docs.mjs';
import { templateFiles, bundledName } from '../packages/create-kumuno/src/template-files.mjs';
import { requireTestDatabaseUrl, verifyGeneratedDatabase } from './verify-generated-database.mjs';
import { verifyLocalDevelopment } from './verify-local-development.mjs';
const localMode=process.argv.includes('--local');
const databaseMode=process.argv.includes('--db');
const testUrl=databaseMode ? requireTestDatabaseUrl(process.env.TEST_DATABASE_URL) : undefined;
const npm=process.env.npm_execpath;
assert(npm,'Run npm run test:pack.');
const packageRoot=fileURLToPath(new URL('../packages/create-kumuno/',import.meta.url));
const temporary=await mkdtemp(join(tmpdir(),'kumuno-packed-'));
const env={...process.env,NEXT_TELEMETRY_DISABLED:'1'};
for(const key of ['DATABASE_URL','TEST_DATABASE_URL','SHADOW_DATABASE_URL','NODE_PATH','SEED_ALLOW_DEVELOPMENT','SEED_ADMIN_PASSWORD','BETTER_AUTH_SECRET','BETTER_AUTH_URL','AUTH_TRUSTED_IP_HEADER']) delete env[key];
function run(args,cwd,capture=false) {
  const result=spawnSync(process.execPath,args,{cwd,env,stdio:capture?'pipe':'inherit',encoding:'utf8'});
  assert.equal(result.status,0,capture?result.stderr:'Packed CLI verification failed.');
  return result.stdout;
}
try {
  const [packed]=JSON.parse(run([npm,'pack','--json','--pack-destination',temporary],packageRoot,true));
  const entries=packed.files.map(file=>file.path);
  assert(entries.includes('LICENSE'));
  assert.equal(packed.name,'create-kumuno');
  assert.equal(packed.version,JSON.parse(await readFile(join(packageRoot,'package.json'))).version);
  for(const entry of templateFiles) assert(entries.some(path=>path===`template/${bundledName(entry)}`||path.startsWith(`template/${bundledName(entry)}/`)),`Missing bundled entry: ${entry}`);
  assert(!entries.some(path=>/(^|\/)(node_modules|generated|\.next|\.git|\.kumuno|test-results|playwright-report)(\/|$)/.test(path)));
  assert(!entries.some(path=>/\.env/.test(path)&&!path.endsWith('__env.example')));
  const runner=join(temporary,'runner');await mkdir(runner);
  run([npm,'install','--prefix',runner,'--ignore-scripts','--no-audit','--no-fund',join(temporary,packed.filename)],temporary);
  const cli=process.platform==='win32' ? join(runner,'node_modules/create-kumuno/src/cli.mjs') : join(runner,'node_modules/.bin/create-kumuno');
  // Execute the installed package outside the repository, including real dependency installation.
  run([cli,'packed-app','--install'],temporary);
  const app=join(temporary,'packed-app');
  await checkApplicationDocumentation(app);
  assert.equal(await readFile(join(app,'LICENSE'),'utf8'),await readFile(join(packageRoot,'LICENSE'),'utf8'));
  assert.equal(JSON.parse(await readFile(join(app,'package.json'))).license,'MIT');
  const applicationLock=JSON.parse(await readFile(join(app,'package-lock.json')));
  assert.equal(applicationLock.packages[''].license,'MIT');
  const inventory=JSON.parse(await readFile(join(app,'docs/dependency-licenses.json')));
  const dependencyHash=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(applicationLock.packages).filter(([path])=>path)))).digest('hex');
  assert.equal(inventory.dependencySha256,dependencyHash,'Generated license inventory must match its dependencies');
  assert.equal(JSON.parse(await readFile(join(app,'package.json'))).name,'packed-app');
  assert.equal(JSON.parse(await readFile(join(app,'package-lock.json'))).packages[''].name,'packed-app');
  for(const entry of ['.gitignore','.npmrc','.nvmrc','.env.example']) assert((await readdir(app)).includes(entry));
  run([npm,'run','check'],app);
  if(databaseMode) await verifyGeneratedDatabase(app,testUrl,npm,run);
  if(localMode) await verifyLocalDevelopment(app,env);
  await rm(temporary,{recursive:true,force:true});
  console.log(`Packed CLI passed: ${entries.length} package files, independent generation, dotfiles, npm ci, documentation, application checks${databaseMode ? ", migration/seed repeatability, DB and authentication browser tests" : ""}${localMode ? ", automatic local PostgreSQL/login/CRUD/persistent restart" : ""}.`);
} catch(error) {
  console.error(`Packed CLI verification failed. Fixture retained: ${temporary}`);
  if(databaseMode) {
    console.error("配布CLIのDB検証に失敗しました。専用DBの接続・権限を確認してください。");
    process.exitCode=1;
  } else throw error;
}
