#!/usr/bin/env node
import { cp, lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const files = ['src', 'prisma', 'scripts', 'tests', 'docs', 'package.json', 'package-lock.json', 'README.md', 'AGENTS.md', 'CLAUDE.md', '.env.example', '.gitignore', '.npmrc', '.nvmrc', 'next.config.ts', 'postcss.config.mjs', 'eslint.config.mjs', 'playwright.config.ts', 'tsconfig.json', 'vitest.config.mts', 'vitest.database.config.mts', 'prisma.config.ts'];
const template = fileURLToPath(new URL('../../../templates/default/', import.meta.url));
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Local preview: create-kumuno <project-name> [--no-install]\nCreates the Next.js/Prisma foundation with email/password authentication. Configure the database and auth settings before login.\nRun from the directory where the new project should be created. Dependencies are installed manually.');
    return;
  }
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Node.js 24.xを使用してください。');
  if (args.some(arg => arg.startsWith('-') && arg !== '--no-install')) throw new Error('未対応のオプションです。--helpを確認してください。');
  const names = args.filter(arg => arg !== '--no-install');
  if (names.length > 1) throw new Error('プロジェクト名は1つ指定してください。');
  let name = names[0];
  if (!name && process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try { name = await rl.question('Project name: '); } finally { rl.close(); }
  }
  if (!name || !/^[a-z][a-z0-9-]{0,63}$/.test(name) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(name)) {
    throw new Error('名前は小文字英字で始まる英数字・ハイフンの1〜64文字にしてください。パスや予約名は指定できません。');
  }
  // Confirm the local template exists before creating anything.
  await readFile(resolve(template, 'package.json'));
  const target = resolve(process.cwd(), name);
  await mkdir(target); // Atomic exclusive creation; existing directories and symlinks fail.
  try {
    for (const file of files) {
      await cp(resolve(template, file), resolve(target, file), {
        recursive: true, force: false, errorOnExist: true,
        filter: async source => {
          const entry = basename(source);
          if (['node_modules', 'generated', '.git', '.next', '.DS_Store'].includes(entry) || (entry.startsWith('.env') && entry !== '.env.example')) return false;
          if ((await lstat(source)).isSymbolicLink()) throw new Error('テンプレートにsymlinkが含まれています。');
          return true;
        },
      });
    }
    for (const file of ['package.json', 'package-lock.json']) {
      const path = resolve(target, file);
      const data = JSON.parse(await readFile(path, 'utf8'));
      data.name = name;
      if (data.packages?.['']) data.packages[''].name = name;
      await writeFile(path, JSON.stringify(data, null, 2) + '\n');
    }
  } catch {
    throw new Error(`生成に失敗しました。途中のファイルは${target}に残しています。既存データの自動削除は行いません。`);
  }
  console.log(`Created ${name} (local preview).\nログインにはDB・認証設定とSeedが必要です。業務機能は開発中です。依存はまだインストールしていません。\n\ncd ${name}\nnpm ci\nnpm run dev\n\nDBを使う場合はREADMEに従い.env.localとPostgreSQLを準備してください。`);
}
main().catch(error => {
  console.error(error.code === 'EEXIST' ? '出力先が既に存在します。別の名前を指定してください。' : error.message);
  process.exitCode = 1;
});
