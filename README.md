# KUMUNO

> AIで小さく作る。でも、将来つながる。

[GitHub: kumuno-dev/kumuno](https://github.com/kumuno-dev/kumuno)

業務を知っている人とAIが、一緒に安全で一貫性のある業務システムを作るための開発基盤です。

KUMUNO is an open-source foundation for building business applications with AI coding agents.

v0.1では、次のコマンドで共通業務基盤を持つプロジェクトを生成できることを目指します。

```sh
npx create-kumuno my-business-app
```

**npm版は未公開です。ローカル試用CLIで現在の基盤を生成できます。** [マスター仕様書 v3.1](docs/master-spec.md)で、CLI・npm公開・生成物の検証をv0.1の必須条件としています。

現在は旧工程のStep 1・2（Next.jsとPrisma / PostgreSQL接続・Migration基盤）と、Milestone 1のリポジトリ構成整理が完了しています。Milestone 2・3の生成物検証、Milestone 4の組織・部署・ユーザー・開発Seedまで実装しました。Milestone 5のログイン・ログアウト・保護ページも実装済みです。Milestone 6の3ロールと共通認可も実装済みです。[認可仕様](docs/authorization.md)を参照してください。Milestone 7の[監査ログ](docs/audit-log.md)を実装済みです。Milestone 8の[ユーザー・部署管理画面](docs/management.md)も利用できます。Milestone 9の[備品管理](docs/equipment.md)も実装済みです。v3.1の工程と実績の対応は[現在の構成と工程](docs/architecture.md)を参照してください。

## ローカルCLIを試す

Node.js 24.xで、リポジトリのルートから実行します。

```sh
npm run create:app -- my-trial-app
cd my-trial-app
npm ci
npm run dev
```

[http://localhost:3000](http://localhost:3000)を開きます。既に使用中なら`npm run dev -- --port 3001`を使ってください。

現在の生成物はNext.js・Prisma基盤と共有マスタ・開発Seedを含み、ログインを利用できます。業務機能は未実装です。DBなしでもトップページは表示できます。依存インストールは手動です。既存のディレクトリへは生成しません。名前は小文字英字で始まる英数字・ハイフンを使用します。

この試用版はリポジトリ内のテンプレートを参照します。npm公開・tgz同梱方式は未対応です。試したアプリを製品リポジトリにcommitしないよう注意してください。別の場所へ作る場合は、そこで`node /絶対パス/kumuno/packages/create-kumuno/src/cli.mjs my-trial-app`を実行します。

## リポジトリ構成

- `packages/create-kumuno`: CLI用workspace。ローカル試用版・非公開。
- `templates/default`: 独立したNext.jsアプリ。専用package.json / lockfileを持つ。
- `docs`: 製品仕様・設計判断。テンプレートのdocsはアプリ利用者向け。

rootのdev・build・DB・テストコマンドはテンプレートへ処理を委譲します。アプリ単独で作業する場合は[テンプレートREADME](templates/default/README.md)を参照してください。

## セットアップ

必要なもの：Node.js **24.x LTS**（検証版は`.nvmrc`）、npm、Git、PostgreSQL **18.x**。トップページの起動・ビルドだけならDBは不要です。

リポジトリを取得し、そのディレクトリで実行してください。nvmを使う場合は先に`nvm install`、`nvm use`を実行します。

```sh
npm ci
npm run setup
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。終了は`Ctrl+C`です。

外部フォントや外部APIは使いません。依存パッケージとテスト用ブラウザーの初回取得にはインターネット接続が必要です。

## PostgreSQLの準備

[PostgreSQL公式](https://www.postgresql.org/download/)の手順でサーバーとCLIを用意し、起動します。DB管理者として接続できるターミナルで、専用ロールとDBを作ります。必要に応じて`PGHOST`・`PGPORT`・`PGUSER`を設定してください。

```sh
createuser --pwprompt kumuno
createdb --owner=kumuno kumuno
createdb --owner=kumuno kumuno_test
createdb --owner=kumuno kumuno_shadow
cp templates/default/.env.example templates/default/.env.local
```

`templates/default/.env.local`の`DATABASE_URL`を実際の接続先と作成したパスワードに置き換えます。パスワードに`@`や`#`などがある場合はURLエンコードします。`.env.local`はGit対象外です。DB CLIは`.env.local`を読み、既存の環境変数を優先します。

```sh
npm run db:check
npm run db:migrate
```

`npm run setup`（テンプレート内では`npm ci`）時にPrisma Clientを自動生成します。モデル変更後は`npm run db:generate`で再生成します。Migrationの作成には、別の専用DBを指す`SHADOW_DATABASE_URL`も設定してください。shadow DBは再構築されるため、開発・テスト・本番DBと共用しません。

初回Migrationは履歴作成、後続MigrationはOrganization・Department・UserとBetter Auth標準テーブルを作成します。詳しい運用規約は[database.md](docs/database.md)を参照してください。

## 開発用Seed

Migration適用後、アプリの`.env.local`へ`SEED_ALLOW_DEVELOPMENT=true`と`SEED_ADMIN_PASSWORD`（自分で決めた12〜128文字）を設定し、`npm run db:seed`を実行します。製品リポジトリでは`templates/default/.env.local`です。接続先が開発用DBであることを確認してください。`NODE_ENV=production`では拒否します。実行後はSeed用設定を削除してください。

サンプル組織、本部→総務部、`admin@example.com`を作成します。固定パスワードはありません。資格情報はBetter Auth標準のハッシュでAccountに保存します。再実行は既存のID・編集内容・パスワードを保持し、パスワード変更には使えません。既存メールとの所属・資格情報の競合時は全体をロールバックします。

このユーザーでログインを試せます。管理者権限はMilestone 6で追加します。Seedは本番の初期管理者作成には使用しません。

## ログインを試す

`templates/default/.env.local`に`BETTER_AUTH_URL=http://localhost:3000`と、32文字以上のランダムな`BETTER_AUTH_SECRET`を設定します。秘密鍵は`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`で生成できます。

Migration・開発Seedの実行後、`npm run dev`で起動し、`http://localhost:3000/login`から`admin@example.com`とSeedで指定したパスワードを入力します。ポートやホスト名を変更する場合はBETTER_AUTH_URLも揃えてください。[認証規約](docs/authentication.md)を参照。

## 検証

初回のみ、テスト用のChromiumをインストールします。

```sh
cd templates/default
npx playwright install chromium
cd ../..
```

Linuxでブラウザーのシステム依存が不足する場合はテンプレート内で`npx playwright install --with-deps chromium`を使います。

```sh
npm run check
```

構成検証に続き、テンプレートのlint、型チェック、単体テスト、本番ビルド、ブラウザーのスモークテストを順に実行します。ブラウザーテストは専用サーバーを`127.0.0.1:3100`で起動・終了します。このポートを空けておいてください。

**テンプレートやCLIを変更した場合は、生成アプリの検証も実行します。**

```sh
npm run test:template
```

CLIでOSの一時ディレクトリに生成し、環境変数のDB設定を引き継がず、npm ci・lint・型チェック・単体テスト・本番ビルド・ブラウザーテストを実行します。成功時は一時生成物を削除し、失敗時は確認用に残して場所を表示します。ネットワーク接続とインストール済みChromiumが必要です。npm run checkと同じポート3100を使うため、順に実行してください。公開用tgzのテストとは別です。

**DB変更時には、さらに実PostgreSQLの結合テストを実行します。** `templates/default/.env.test.local`を作り、専用テストDBを指定します（パスワード部分は自分の設定に置き換えます）。

```dotenv
TEST_DATABASE_URL=postgresql://kumuno:REPLACE_WITH_YOUR_PASSWORD@127.0.0.1:5432/kumuno_test
```

```sh
npm run test:db
npm run test:auth
```

CLIやテンプレートのDB基盤を変更した場合は、生成物でも検証します。同じ`templates/default/.env.test.local`の専用TEST_DATABASE_URLを使います。

```sh
npm run test:template:db
```

生成アプリの.env.local / .env.test.local経由で接続・MigrationとSeedの初回/再実行・実DB結合テスト・認証ブラウザーテストを確認します。専用DB内の一意なschemaだけを作成・削除し、接続情報を保存した一時ファイルは失敗時も除去します。接続設定なしでは省略せず失敗します。生成に続いてnpm ciを行うためネットワーク接続が必要です。

DB名は`_test`で終わる必要があります。テストは毎回一意なschemaを作成し、それだけを削除します。`DATABASE_URL`への代替接続や、設定なしでのテスト省略は行いません。テストロールには専用DB内でのschema作成権限が必要です。

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run lint` | ESLint（警告もエラー扱い） |
| `npm run typecheck` | Next.jsの型生成とTypeScript strict検査 |
| `npm test` | 単体テスト＋本番ビルド＋PC・スマートフォンのスモークテスト |
| `npm run test:unit` | DB設定・エラー処理の単体テスト |
| `npm run test:db` | 実PostgreSQLの結合テスト（別途必須） |
| `npm run test:auth` | 専用DBとブラウザーによる認証検証（別途必須） |
| `npm run test:e2e` | 本番ビルドとブラウザーテスト |
| `npm run db:check` | 接続を確認して終了 |
| `npm run db:generate` | Prisma Client生成（DB接続不要） |
| `npm run db:migration:create -- --name 変更名` | 開発DB・shadow DBを使ってMigration SQLを作成（適用前にレビュー） |
| `npm run db:migrate` | 未適用のMigrationを適用 |
| `npm run db:seed` | 開発用の組織・部署・ユーザーを作成 |
| `npm run build` | 本番ビルド |
| `npm start` | ビルド済みアプリの起動 |

.nextを生成する`npm run test:auth`・`npm test`・`npm run build`は同じ`.next`へ出力するため、同時に実行しないでください。

## 構成と開発方針

Next.js App Router、React、TypeScript、Tailwind CSSを使います。Server Componentsを基本とし、特定のAIサービスへ依存するコードは組み込みません。

- [最上位仕様](docs/master-spec.md)
- [現在の構成と工程](docs/architecture.md)
- [Milestone 0の技術設計案](docs/design/milestone-0.md)
- [Step 1の依存ライブラリ選定](docs/decisions/0001-project-foundation.md)
- [Step 2のDBライブラリ選定](docs/decisions/0002-postgresql-foundation.md)
- [DB・Migration規約](docs/database.md)
- [Domain境界](docs/domain-boundaries.md)
- [将来の連携方針](docs/integration.md)
- [エージェント向け入口](AGENTS.md)

仕様の正本は`docs/`です。変更は小さな単位で実装・検証し、関連ドキュメントも更新します。

## ライセンス

本体はMIT Licenseを第一候補とし、v0.1公開前に最終決定します。現段階では配布ライセンス未確定のため、package.jsonは`private: true`、`license: UNLICENSED`です。依存ライブラリのライセンスは本体とは別に確認します。
