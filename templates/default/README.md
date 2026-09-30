# KUMUNO application template

現在はNext.js・Prisma・PostgreSQLの基盤です。メール・パスワード認証と[3ロールの共通認可](docs/authorization.md)を実装済みです。部署移動・ユーザー無効化の[監査ログ](docs/audit-log.md)を実装済みです。[ユーザー・部署管理画面](docs/management.md)を利用できます。[備品管理](docs/equipment.md)も利用できます。このディレクトリ単独でセットアップできます。

## セットアップ

必要なもの：Node.js **24.x LTS**（検証版は`.nvmrc`）、npm、Git、PostgreSQL **18.x**。トップページの起動・ビルドだけならDBは不要です。

CLIで生成したアプリのディレクトリで実行してください。nvmを使う場合は先に`nvm install`、`nvm use`を実行します。

```sh
npm ci
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。終了は`Ctrl+C`です。

ポート3000を使用中なら`npm run dev -- --port 3001`で起動できます。

組織・部署・ユーザーと開発Seedを利用できます。ログインを利用できます。[ユーザー・部署管理画面](docs/management.md)を利用できます。[備品管理](docs/equipment.md)も利用できます。DBの設定は次の手順で行います。

外部フォントや外部APIは使いません。依存パッケージとテスト用ブラウザーの初回取得にはインターネット接続が必要です。

## PostgreSQLの準備

[PostgreSQL公式](https://www.postgresql.org/download/)の手順でサーバーとCLIを用意し、起動します。DB管理者として接続できるターミナルで、専用ロールとDBを作ります。必要に応じて`PGHOST`・`PGPORT`・`PGUSER`を設定してください。

```sh
createuser --pwprompt kumuno
createdb --owner=kumuno kumuno
createdb --owner=kumuno kumuno_test
createdb --owner=kumuno kumuno_shadow
cp .env.example .env.local
```

`.env.local`の`DATABASE_URL`を実際の接続先と作成したパスワードに置き換えます。パスワードに`@`や`#`などがある場合はURLエンコードします。`.env.local`はGit対象外です。DB CLIは`.env.local`を読み、既存の環境変数を優先します。

```sh
npm run db:check
npm run db:migrate
```

`npm ci`時にPrisma Clientを自動生成します。モデル変更後は`npm run db:generate`で再生成します。Migrationの作成には、別の専用DBを指す`SHADOW_DATABASE_URL`も設定してください。shadow DBは再構築されるため、開発・テスト・本番DBと共用しません。

MigrationはOrganization・階層Department・UserとBetter Auth標準テーブルを作成します。詳しい運用規約は[database.md](docs/database.md)を参照してください。

## 開発用Seed

Migration適用後、アプリの`.env.local`へ`SEED_ALLOW_DEVELOPMENT=true`と`SEED_ADMIN_PASSWORD`（自分で決めた12〜128文字）を設定し、`npm run db:seed`を実行します。製品リポジトリでは`templates/default/.env.local`です。接続先が開発用DBであることを確認してください。`NODE_ENV=production`では拒否します。実行後はSeed用設定を削除してください。

サンプル組織、本部→総務部、`admin@example.com`を作成します。固定パスワードはありません。資格情報はBetter Auth標準のハッシュでAccountに保存します。再実行は既存のID・編集内容・パスワードを保持し、パスワード変更には使えません。既存メールとの所属・資格情報の競合時は全体をロールバックします。

このユーザーでログインを試せます。管理者権限はMilestone 6で追加します。Seedは本番の初期管理者作成には使用しません。

## ログインを試す

`.env.local`に`BETTER_AUTH_URL=http://localhost:3000`と、32文字以上のランダムな`BETTER_AUTH_SECRET`を設定します。秘密鍵は`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`で生成できます。

Migration・開発Seedの実行後、`npm run dev`で起動し、`http://localhost:3000/login`から`admin@example.com`とSeedで指定したパスワードを入力します。ポートやホスト名を変更する場合はBETTER_AUTH_URLも揃えてください。[認証規約](docs/authentication.md)を参照。

## 検証

初回のみ、テスト用のChromiumをインストールします。

```sh
npx playwright install chromium
```

Linuxでブラウザーのシステム依存が不足する場合は`npx playwright install --with-deps chromium`を使います。

```sh
npm run check
```

lint、型チェック、単体テスト、本番ビルド、ブラウザーのスモークテストを順に実行します。ブラウザーテストは専用サーバーを`127.0.0.1:3100`で起動・終了します。このポートを空けておいてください。

**DB変更時には、さらに実PostgreSQLの結合テストを実行します。** `.env.test.local`を作り、専用テストDBを指定します（パスワード部分は自分の設定に置き換えます）。

```dotenv
TEST_DATABASE_URL=postgresql://kumuno:REPLACE_WITH_YOUR_PASSWORD@127.0.0.1:5432/kumuno_test
```

```sh
npm run test:db
npm run test:auth
```

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

## アプリの規約

- [構成](docs/architecture.md)
- [DB規約](docs/database.md)
- [AI向け入口](AGENTS.md)

本体の配布ライセンスは未確定です。

## セットアップで困った場合

| 状況 | 確認すること |
| --- | --- |
| npm ciがNodeのバージョンで失敗する | node --versionで24.xか確認し、nvm use等で切り替える |
| Prisma Clientが見つからない | npm ciを完了する。モデル変更後はnpm run db:generate |
| DB操作でDATABASE_URL未設定と表示される | このアプリ直下の.env.localを設定する |
| test:dbが設定不足で失敗する | .env.test.localに専用TEST_DATABASE_URLを指定する |
| ブラウザーテストが起動しない | Chromiumをインストールし、ポート3100を空ける |

生成アプリの依存・設定・docsはこのディレクトリ内で完結します。KUMUNO開発用リポジトリを参照せず、このREADMEとdocsを基準に保守してください。
