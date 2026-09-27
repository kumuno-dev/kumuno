# 0001: Step 1の開発基盤

日付：2026-09-27。対象：Step 1。正確な直接依存バージョンはpackage.json、推移依存はpackage-lock.jsonを正本とする。

## 選定

| 依存 | 必要性・標準機能で代替しない理由 | 代替案 | ライセンス |
| --- | --- | --- | --- |
| Next.js / React / React DOM | 仕様指定のApp Router・Server Components・画面描画 | 別フレームワークは仕様外 | MIT |
| TypeScript | strictな静的型検査。JavaScriptのみでは型検査できない | JavaScript + JSDoc | Apache-2.0 |
| Tailwind CSS / @tailwindcss/postcss | 仕様指定のスタイル基盤とNext.js CSSビルドへの連携 | 通常のCSS | MIT |
| ESLint / @eslint/js / typescript-eslint | JavaScript・TypeScriptの静的解析。型検査だけではカバーしない規則を検証 | Biome | MIT |
| @next/eslint-plugin-next / eslint-plugin-react-hooks | Next.js・React Hooksの公式ルールを適用 | eslint-config-nextは下記の互換性制約あり | MIT |
| @types/node / @types/react / @types/react-dom | 外部APIのTypeScript型定義 | 自前の型定義は保守負担が大きい | MIT |
| @playwright/test | 実ブラウザーでSSR・CSS・画面遷移・HTTP応答を確認 | node:test + HTTP確認では画面を確認できない。Cypressも候補 | Apache-2.0 |

Node.js 24 LTSを採用する。npmに統一し、直接依存は完全なバージョン、再現には`npm ci`を用いる。Next.jsと@next/eslint-plugin-nextは同じバージョンとする。TypeScriptはtypescript-eslintの対応範囲を確認した5.9系を使い、メジャー更新は別工程で評価する。

2026-09-27にnpm公式レジストリの安定版・engines・licenseと公式ドキュメントを確認した。Next.js、React、Tailwind、Playwrightには安定版の更新がある。ESLintは保守中の10系を使う。eslint-config-nextの推移依存（react、import、jsx-a11yの各プラグイン）はESLint 10をpeer dependencyに含まないため、対応済みの公式Next.js・React Hooks・TypeScriptルールを直接組み合わせる。依存の強制解決はしない。専用のアクセシビリティlintは未導入で、意味のあるHTMLとブラウザー確認を基本とする。

推移依存のライセンスと脆弱性もインストール後のlockfileを対象に確認する。

## Step 1での依存確認

lockfileの直接・推移依存にはライセンス不明のエントリーはなかった。MIT、Apache-2.0、ISC、BSD等に加え、以下が含まれる。OS別のoptional dependenciesもlockfileの確認対象とした。

- Next.js → sharp → libvipsの配布パッケージ：LGPL-3.0-or-laterを含む。インストール済みパッケージのREADMEには同梱ライブラリ個別のライセンス一覧もある。
- TailwindのCSS処理に使うlightningcss：MPL-2.0。
- ブラウザー対応データのcaniuse-lite：CC-BY-4.0。

本体のMIT候補と、これらの依存物のライセンスは分けて扱う。公開時はソースとバイナリの配布範囲を確定し、同梱する依存物のライセンス文書・表示・ソース提供条件を個別確認する。lockfileのメタデータ確認だけで再配布条件をすべて確認済みとはしない。Step 1では公開・バイナリ配布を行わない。

インストール時の`npm audit`は脆弱性0件。これは確認時点の登録情報に対する結果であり、依存更新時にも再確認する。

## テスト方針

Step 1ではPlaywrightによる最小スモークテストだけを用意する。Vitestのためのダミー業務関数やテストは作らない。業務ロジックが入る工程でVitestを追加する。

`npm test`は本番ビルドを作成し、専用ポートで起動してからテストする。既存サーバーを再利用しないため、古いビルドを誤ってテストしない。PCとスマートフォンのChromiumを対象とし、他のブラウザーの互換性はこの段階では保証しない。

Next.jsのビルドはlintを代替しないため、`npm run check`でlint・型チェック・テストを明示的に実行する。

## 参照

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Node.js release status](https://nodejs.org/en/about/previous-releases)
- [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [Next.js Playwright guide](https://nextjs.org/docs/app/guides/testing/playwright)
- [Next.js license](https://github.com/vercel/next.js/blob/canary/license.md)
- [React license](https://github.com/facebook/react/blob/main/LICENSE)
- [TypeScript license](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt)
- [Tailwind CSS license](https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE)
- [ESLint license](https://github.com/eslint/eslint/blob/main/LICENSE)
- [DefinitelyTyped license](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/LICENSE)
- [Playwright license](https://github.com/microsoft/playwright/blob/main/LICENSE)
