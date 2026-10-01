import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { checkApplicationDocumentation } from './check-application-docs.mjs';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const project = await readJson('package.json');
const template = await readJson('templates/default/package.json');
const lock = await readJson('templates/default/package-lock.json');
assert.equal(project.private, true);
assert.deepEqual(project.workspaces, ['packages/create-kumuno','packages/auth','packages/rbac']);
assert.equal(template.workspaces, undefined);
assert.equal(lock.packages[''].name, template.name);
for (const group of ['dependencies', 'devDependencies']) {
  assert.deepEqual(lock.packages[''][group], template[group]);
  for (const [name,version] of Object.entries(template[group] ?? {})) {
    assert(!/^(workspace:|file:|link:)/.test(version) || (['auth','rbac'].some(pkg => name === '@kumuno/'+pkg && version === 'file:vendor/kumuno-'+pkg+'-0.1.0-rc.0.tgz')), 'Only self-contained first-party distributions are allowed as a local dependency');
  }
}
for (const path of ['README.md', 'AGENTS.md', 'CLAUDE.md', '.env.example', '.npmrc', '.nvmrc', 'docs/architecture.md', 'docs/database.md']) {
  await access(resolve(root, 'templates/default', path));
}
await checkApplicationDocumentation(resolve(root, 'templates/default'));
console.log('Workspace boundaries and standalone template manifest verified. Bundled CLI is tested separately.');

for (const pkg of ['auth','rbac']) {
  const archive=resolve(root,`templates/default/vendor/kumuno-${pkg}-0.1.0-rc.0.tgz`);
  const bytes=await readFile(archive);
  assert.equal(lock.packages['node_modules/@kumuno/'+pkg].integrity,'sha512-'+createHash('sha512').update(bytes).digest('base64'),pkg+' distribution and lock must agree');
  const files=['package.json','LICENSE','README.md','src/index.mjs','src/index.d.mts'];
  const names=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n').sort();
  assert.deepEqual(names,files.map(p=>'package/'+p).sort(),pkg+' distribution must contain only its public files');
  for(const file of files) assert.equal(execFileSync('tar',['-xOf',archive,'package/'+file],{encoding:'utf8'}),await readFile(resolve(root,'packages/'+pkg,file),'utf8'),pkg+' distribution is stale: '+file);
  console.log(pkg+' distribution: public files, source correspondence and lock integrity verified.');
}
