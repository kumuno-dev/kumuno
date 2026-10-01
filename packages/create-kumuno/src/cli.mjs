#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { spawn } from 'node:child_process';
import { templateFiles, templateFilter, bundledName } from './template-files.mjs';
const template = fileURLToPath(new URL('../template/', import.meta.url));
function instructions(name, installed) {
  return `cd ${name}\n${installed ? '' : 'npm ci\n'}cp .env.example .env.local\n\nREADMEに従ってPostgreSQLと認証設定を準備してください。\n開発DBを設定後: npm run db:migrate → npm run db:seed → npm run dev\nSeedには自分で決めた初期パスワードが必要です。\n設定と詳しい手順: ${name}/README.md\nAIとの開発手順: ${name}/docs/adding-a-feature.md`;
}
async function installDependencies(target) {
  const npmScript = process.env.npm_execpath;
  const command = npmScript ? process.execPath : process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = npmScript ? [npmScript, 'ci', '--include=dev'] : process.platform === 'win32' ? ['/d','/s','/c','npm ci --include=dev'] : ['ci','--include=dev'];
  return new Promise(resolveResult => {
    const child = spawn(command,args,{cwd:target,stdio:'inherit',shell:false});
    child.once('error',()=>resolveResult(false));
    child.once('exit',code=>resolveResult(code===0));
  });
}
async function main() {
  const args=process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('create-kumuno <project-name> [--install | --no-install] [--yes]\n\n認証・権限・監査・ユーザー／部署／備品管理と開発文書を生成します。\n名前は小文字英字で始まる英数字・ハイフン。既存先は上書きしません。\n--install      npm ciで依存を導入\n--no-install   依存を導入せず生成\n--yes          依存を導入し確認を省略（名前の指定は必須）\n対話実行では依存導入を確認します。非対話の既定値は導入なし。\nNode.js 24.x / npmが必要です。'); return;
  }
  if (Number(process.versions.node.split('.')[0])!==24) throw new Error('Node.js 24.xを使用してください。');
  const options=new Set(['--install','--no-install','--yes']);
  if(args.some(arg=>arg.startsWith('-')&&!options.has(arg))) throw new Error('未対応のオプションです。--helpを確認してください。');
  if(args.includes('--no-install')&&(args.includes('--install')||args.includes('--yes'))) throw new Error('--install / --yes と --no-install は同時に指定できません。');
  const names=args.filter(arg=>!options.has(arg));
  if(names.length>1) throw new Error('プロジェクト名は1つ指定してください。');
  let name=names[0];
  const interactive=process.stdin.isTTY&&process.stdout.isTTY;
  const rl=interactive?createInterface({input:process.stdin,output:process.stdout}):undefined;
  let install=args.includes('--install')||args.includes('--yes');
  try {
    if(!name&&rl&&!args.includes('--yes')) name=(await rl.question('Project name: ')).trim();
    if(!name||!/^[a-z][a-z0-9-]{0,63}$/.test(name)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(name)) throw new Error('名前は小文字英字で始まる英数字・ハイフンの1〜64文字にしてください。パスや予約名は指定できません。');
    if(rl&&!args.some(arg=>options.has(arg))) {
      const answer=(await rl.question('npmで依存パッケージをインストールしますか？ [Y/n] ')).trim().toLowerCase();
      if(!['','y','yes','n','no'].includes(answer)) throw new Error('y または n を入力してください。');
      install=!['n','no'].includes(answer);
    }
  } finally { rl?.close(); }
  try { await readFile(resolve(template,'package.json')); }
  catch { throw new Error('同梱テンプレートがありません。開発リポジトリではnpm run build:cliを実行してください。'); }
  const target=resolve(process.cwd(),name);
  await mkdir(target);
  try {
    for(const entry of templateFiles) await cp(resolve(template,bundledName(entry)),resolve(target,entry),{recursive:true,force:false,errorOnExist:true,filter:templateFilter});
    for(const entry of ['package.json','package-lock.json']) {
      const path=resolve(target,entry),data=JSON.parse(await readFile(path,'utf8'));
      data.name=name;if(data.packages?.[''])data.packages[''].name=name;
      await writeFile(path,JSON.stringify(data,null,2)+'\n');
    }
  } catch { throw new Error(`生成に失敗しました。途中のファイルは${target}に残しています。既存データの自動削除は行いません。`); }
  console.log(`Created ${name}.`);
  if(install) {
    console.log('依存パッケージをインストールしています…');
    if(!await installDependencies(target)) {
      console.error(`依存の導入に失敗しました。生成済みファイルは保持しています。\n${instructions(name,false)}`);
      process.exitCode=1;return;
    }
  }
  console.log(instructions(name,install));
}
main().catch(error=>{
 console.error(error.code==='EEXIST'?'出力先が既に存在します。別の名前を指定してください。':error.message);
 process.exitCode=1;
});
