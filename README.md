# Oshigoto Kit

> 社内システムを、AIと作る。

業務を知っている人とAIが、一緒に安全で一貫性のある業務システムを作るための開発基盤です。

Oshigoto Kit is an open-source foundation for building business applications with AI coding agents.

**現在はv0.1のStep 1（プロジェクト初期化）です。** 日本語のトップページと検証環境を用意しています。認証・組織・権限・監査・備品管理は今後実装します。現時点で実運用向けの業務機能はありません。

## セットアップ

必要なもの：Node.js **24.x LTS**（検証版は`.nvmrc`）、npm、Git。Step 1ではPostgreSQLや環境変数の設定は不要です。

リポジトリを取得し、そのディレクトリで実行してください。nvmを使う場合は先に`nvm install`、`nvm use`を実行します。

```sh
npm ci
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。終了は`Ctrl+C`です。

外部フォントや外部APIは使いません。依存パッケージとテスト用ブラウザーの初回取得にはインターネット接続が必要です。

## 検証

初回のみ、テスト用のChromiumをインストールします。

```sh
npx playwright install chromium
```

Linuxでブラウザーのシステム依存が不足する場合は`npx playwright install --with-deps chromium`を使います。

```sh
npm run check
```

lint、型チェック、本番ビルド、ブラウザーのスモークテストを順に実行します。テストは専用サーバーを`127.0.0.1:3100`で起動・終了します。このポートを空けておいてください。

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run lint` | ESLint（警告もエラー扱い） |
| `npm run typecheck` | Next.jsの型生成とTypeScript strict検査 |
| `npm test` | 本番ビルドとPC・スマートフォンのスモークテスト |
| `npm run build` | 本番ビルド |
| `npm start` | ビルド済みアプリの起動 |

`npm test`と`npm run build`は同じ`.next`へ出力するため、同時に実行しないでください。

## 構成と開発方針

Next.js App Router、React、TypeScript、Tailwind CSSを使います。Server Componentsを基本とし、特定のAIサービスへ依存するコードは組み込みません。

- [最上位仕様](docs/master-spec.md)
- [現在の構成と工程](docs/architecture.md)
- [Step 1の依存ライブラリ選定](docs/decisions/0001-project-foundation.md)
- [エージェント向け入口](AGENTS.md)

仕様の正本は`docs/`です。変更は小さな単位で実装・検証し、関連ドキュメントも更新します。

## ライセンス

本体はMIT Licenseを第一候補とし、v0.1公開前に最終決定します。現段階では配布ライセンス未確定のため、package.jsonは`private: true`、`license: UNLICENSED`です。依存ライブラリのライセンスは本体とは別に確認します。
