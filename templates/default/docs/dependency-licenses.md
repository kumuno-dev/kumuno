# 依存ライブラリのライセンス一覧

このアプリのpackage-lock.jsonにある全497パッケージ項目（推移依存・OS別optionalを含む）のライセンス宣言を記録します。[機械可読の一覧](dependency-licenses.json)には導入経路・名前・版・宣言・取得先を含め、lockfileの依存項目のSHA-256（アプリ名・ルート項目を除く）で対応を確認できます。同名パッケージの別版やOS別項目はそれぞれ数えます。

KUMUNOが作成したコードは[MIT](../LICENSE)です。依存パッケージの許諾は各パッケージ自身のLICENSE / NOTICEに従います。この一覧はnpm lockfileの宣言の棚卸しで、ネイティブバイナリ内部の全コンポーネントの許諾一覧ではありません。

CLI配布にはnode_modulesやネイティブバイナリを同梱せず、生成先のnpm ciが各パッケージを取得します。生成アプリやコンテナ・ビルド成果物を再配布する際は、実際に含める依存のLICENSE / NOTICEと対応するソースの提供条件を確認してください。依存を変更した場合はこの一覧も更新してください。

## 直接依存

| パッケージ | 版 | 宣言 | 用途 |
| --- | --- | --- | --- |
| @prisma/adapter-pg | 7.10.0 | Apache-2.0 | 実行時 |
| @prisma/client | 7.10.0 | Apache-2.0 | 実行時 |
| better-auth | 1.7.6 | MIT | 実行時 |
| next | 16.3.6 | MIT | 実行時 |
| pg | 8.23.0 | MIT | 実行時 |
| react | 19.3.0 | MIT | 実行時 |
| react-dom | 19.3.0 | MIT | 実行時 |
| server-only | 0.0.1 | MIT | 実行時 |
| @eslint/js | 10.0.1 | MIT | 開発時 |
| @next/eslint-plugin-next | 16.3.6 | MIT | 開発時 |
| @playwright/test | 1.63.0 | Apache-2.0 | 開発時 |
| @tailwindcss/postcss | 4.3.3 | MIT | 開発時 |
| @types/node | 24.19.0 | MIT | 開発時 |
| @types/pg | 8.23.1 | MIT | 開発時 |
| @types/react | 19.3.0 | MIT | 開発時 |
| @types/react-dom | 19.3.0 | MIT | 開発時 |
| eslint | 10.11.0 | MIT | 開発時 |
| eslint-plugin-react-hooks | 7.1.1 | MIT | 開発時 |
| prisma | 7.10.0 | Apache-2.0 | 開発時 |
| tailwindcss | 4.3.3 | MIT | 開発時 |
| tsx | 4.23.15 | MIT | 開発時 |
| typescript | 5.9.3 | Apache-2.0 | 開発時 |
| typescript-eslint | 8.70.1 | MIT | 開発時 |
| vitest | 5.0.2 | MIT | 開発時 |

## 全項目の宣言集計

| 宣言（原文） | 項目数 |
| --- | --- |
| 0BSD | 2 |
| Apache-2.0 | 57 |
| Apache-2.0 AND LGPL-3.0-or-later | 3 |
| Apache-2.0 AND LGPL-3.0-or-later AND MIT | 1 |
| BlueOak-1.0.0 | 1 |
| BSD-2-Clause | 7 |
| BSD-3-Clause | 4 |
| CC-BY-4.0 | 1 |
| EPL-2.0 | 1 |
| ISC | 34 |
| LGPL-3.0-or-later | 10 |
| MIT | 349 |
| MIT and ISC | 1 |
| MPL-2.0 | 24 |
| Unlicense | 2 |

## 個別に確認するもの

- sharpのOS別libvips / wasm / WindowsパッケージにはLGPLを含む宣言があります。[sharp-libvipsの配布元](https://github.com/lovell/sharp-libvips)と取得したパッケージ内の情報を確認してください。
- lightningcssとOS別パッケージはMPL-2.0、elkjsはEPL-2.0、caniuse-liteはCC-BY-4.0を宣言しています。許諾文・著作権表示・再配布する成果物を個別に確認してください。
- 「MIT and ISC」などの表記はlockfileの原文を保持し、別のライセンス表記へ自動変換していません。

依存を変更した際は、この文書とJSONを新しいlockfileに合わせて保守してください。ライセンスはpackage-lock.jsonの各依存項目のlicenseに記録されています。
