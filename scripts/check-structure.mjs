import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const project = await readJson('package.json');
const template = await readJson('templates/default/package.json');
const lock = await readJson('templates/default/package-lock.json');
assert.equal(project.private, true);
assert.deepEqual(project.workspaces, ['packages/create-kumuno']);
assert.equal(template.workspaces, undefined);
assert.equal(lock.packages[''].name, template.name);
for (const group of ['dependencies', 'devDependencies']) {
  assert.deepEqual(lock.packages[''][group], template[group]);
  for (const version of Object.values(template[group] ?? {})) {
    assert(!/^(workspace:|file:|link:)/.test(version), 'Template must not depend on repository files');
  }
}
for (const path of ['README.md', 'AGENTS.md', 'CLAUDE.md', '.env.example', '.npmrc', '.nvmrc', 'docs/architecture.md', 'docs/database.md']) {
  await access(resolve(root, 'templates/default', path));
}
console.log('Workspace boundaries and standalone template manifest verified. CLI local preview is tested separately.');
