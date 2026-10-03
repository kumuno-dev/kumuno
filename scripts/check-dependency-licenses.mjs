import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const template=fileURLToPath(new URL('../templates/default/',import.meta.url));
const lockText=await readFile(`${template}package-lock.json`,'utf8');
const lock=JSON.parse(lockText);
const manifest=JSON.parse(await readFile(`${template}package.json`,'utf8'));
const entries=Object.entries(lock.packages).filter(([path])=>path).map(([path,pkg])=>{
  assert(pkg.version && typeof pkg.license==='string' && pkg.license.trim(),`Missing license/version: ${path}`);
  return {path,name:path.split('node_modules/').at(-1),version:pkg.version,license:pkg.license,
    development:!!pkg.dev,optional:!!pkg.optional,tarball:pkg.resolved};
});
const inventory=JSON.stringify({source:'package-lock.json',dependencySha256:createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(lock.packages).filter(([path])=>path)))).digest('hex'),entries},null,2)+'\n';
const counts=new Map();for(const pkg of entries)counts.set(pkg.license,(counts.get(pkg.license)??0)+1);
const direct=Object.entries({...manifest.dependencies,...manifest.devDependencies}).map(([name,version])=>{
  const pkg=lock.packages[`node_modules/${name}`];assert.equal(pkg.version,["@kumuno/auth", "@kumuno/rbac", "@kumuno/audit-log", "@kumuno/approval", "@kumuno/print"].includes(name) ? "0.1.0-rc.0" : version);
  return `| ${name} | ${version} | ${pkg.license} | ${manifest.dependencies[name]?'実行時':'開発時'} |`;
}).join('\n');
const summary=[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([license,count])=>`| ${license} | ${count} |`).join('\n');
const document=`# 依存ライブラリのライセンス一覧

このアプリのpackage-lock.jsonにある全${entries.length}パッケージ項目（推移依存・OS別optionalを含む）のライセンス宣言を記録します。[機械可読の一覧](dependency-licenses.json)には導入経路・名前・版・宣言・取得先を含め、lockfileの依存項目のSHA-256（アプリ名・ルート項目を除く）で対応を確認できます。同名パッケージの別版やOS別項目はそれぞれ数えます。

KUMUNOが作成したコードは[MIT](../LICENSE)です。依存パッケージの許諾は各パッケージ自身のLICENSE / NOTICEに従います。この一覧はnpm lockfileの宣言の棚卸しで、ネイティブバイナリ内部の全コンポーネントの許諾一覧ではありません。

CLI配布にはnode_modulesやネイティブバイナリを同梱せず、生成先のnpm ciが各パッケージを取得します。生成アプリやコンテナ・ビルド成果物を再配布する際は、実際に含める依存のLICENSE / NOTICEと対応するソースの提供条件を確認してください。依存を変更した場合はこの一覧も更新してください。

## 直接依存

| パッケージ | 版 | 宣言 | 用途 |
| --- | --- | --- | --- |
${direct}

## 全項目の宣言集計

| 宣言（原文） | 項目数 |
| --- | --- |
${summary}

## 個別に確認するもの

- sharpのOS別libvips / wasm / WindowsパッケージにはLGPLを含む宣言があります。[sharp-libvipsの配布元](https://github.com/lovell/sharp-libvips)と取得したパッケージ内の情報を確認してください。
- lightningcssとOS別パッケージはMPL-2.0、elkjsはEPL-2.0、caniuse-liteはCC-BY-4.0を宣言しています。許諾文・著作権表示・再配布する成果物を個別に確認してください。
- 「MIT and ISC」などの表記はlockfileの原文を保持し、別のライセンス表記へ自動変換していません。

依存を変更した際は、この文書とJSONを新しいlockfileに合わせて保守してください。ライセンスはpackage-lock.jsonの各依存項目のlicenseに記録されています。
`;
for(const [path,content] of [['docs/dependency-licenses.json',inventory],['docs/dependency-licenses.md',document]]){
 if(process.argv.includes('--write'))await writeFile(`${template}${path}`,content);
 else assert.equal(await readFile(`${template}${path}`,'utf8'),content,`License inventory outdated: ${path}. Run npm run licenses:update.`);
}
console.log(`Dependency license declarations verified: ${entries.length} lockfile entries, no missing declarations.`);
