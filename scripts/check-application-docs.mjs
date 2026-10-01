import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

export const requiredDocumentation = [
  'README.md', 'AGENTS.md', 'CLAUDE.md', 'docs/README.md',
  'docs/architecture.md', 'docs/database.md', 'docs/authentication.md',
  'docs/authorization.md', 'docs/organization.md', 'docs/integration.md',
  'docs/domain-boundaries.md', 'docs/audit-log.md', 'docs/adding-a-feature.md',
  'docs/coding-conventions.md', 'docs/deployment.md', 'docs/equipment.md', 'docs/management.md',
];

// Run before npm ci: application documentation must stand alone in a generated project.
export async function checkApplicationDocumentation(directory) {
  const root = resolve(directory);
  for (const path of requiredDocumentation) {
    await access(resolve(root, path));
    assert((await readFile(resolve(root, path), 'utf8')).trim(), `Empty documentation: ${path}`);
  }
  const documents = new Set(requiredDocumentation);
  for (const path of await readdir(resolve(root, 'docs'), { recursive: true })) {
    if (path.endsWith('.md')) documents.add(`docs/${path}`);
  }
  for (const path of documents) {
    const content = await readFile(resolve(root, path), 'utf8');
    assert(!content.includes('docs/master-spec.md'), `Product specification leaked into application: ${path}`);
    assert(!content.includes('/Users/'), `Machine-specific path in application documentation: ${path}`);
    // Ignore example code, then inspect inline Markdown links (file anchors are optional).
    const prose = content.replace(/```[\s\S]*?```/g, '');
    for (const match of prose.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      let target = match[1].trim();
      if (target.startsWith('<')) target = target.slice(1, target.indexOf('>'));
      else target = target.split(/\s+["']/)[0];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
      const filename = decodeURIComponent(target.split('#')[0]);
      assert(filename && !isAbsolute(filename), `Invalid application link: ${path} -> ${target}`);
      const resolved = resolve(root, dirname(path), filename);
      const within = relative(root, resolved);
      assert(within !== '..' && !within.startsWith('../') && !isAbsolute(within), `Application link escapes project: ${path} -> ${target}`);
      await access(resolved).catch(() => { throw new Error(`Broken application link: ${path} -> ${target}`); });
    }
  }
  console.log('Application documentation: required files and local links verified.');
}
