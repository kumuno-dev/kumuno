import { lstat } from 'node:fs/promises';
import { basename } from 'node:path';
export const templateFiles = ['src', 'prisma', 'scripts', 'tests', 'docs', 'package.json', 'package-lock.json', 'README.md', 'AGENTS.md', 'CLAUDE.md', '.env.example', '.gitignore', '.npmrc', '.nvmrc', 'next.config.ts', 'postcss.config.mjs', 'eslint.config.mjs', 'playwright.config.ts', 'tsconfig.json', 'vitest.config.mts', 'vitest.database.config.mts', 'prisma.config.ts'];
// npm omits or renames some dotfiles; restore their real names during generation.
export function bundledName(entry) { return entry.startsWith('.') ? `__${entry.slice(1)}` : entry; }
export async function templateFilter(source) {
  const entry = basename(source);
  if (['node_modules', 'generated', '.git', '.next', '.DS_Store', 'coverage', 'out', 'playwright-report', 'test-results', 'next-env.d.ts'].includes(entry) || entry.endsWith('.tsbuildinfo') || entry.endsWith('.log') || (entry.startsWith('.env') && entry !== '.env.example')) return false;
  if ((await lstat(source)).isSymbolicLink()) throw new Error('テンプレートにsymlinkが含まれています。');
  return true;
}
