# KUMUNOで生成した業務アプリ

認証・組織・ユーザー・部署・権限・監査と、備品管理の参照実装と医療機器台帳を持つ業務アプリです。このディレクトリ単独でセットアップ・開発できます。AIとの開発は[機能追加手順](docs/adding-a-feature.md)から始めます。

## まず手元で試す（おすすめ）

Node.js **24.x**とnpmを用意して実行します。PostgreSQL・Dockerの別途導入や、接続URLの手入力は不要です。

```sh
npm ci
npm run dev:local
```

表示されたURLを開き、メール`admin@example.com`と`.kumuno/local/login.txt`に保存された初期パスワードでログインします。CLIで依存を導入済みならnpm ciは不要です。

Ctrl+Cで終了し、次回も同じコマンドで再開できます。DBデータは保持されます。既存の.env.localや接続環境変数は上書きしません。詳しくは[手元で試す](docs/local-development.md)を参照してください。本番や既存DBのセットアップは次の手順を使います。

## 医療機器台帳を試す

ログイン後、左の「医療機器台帳」→「医療機器を登録」を開きます。機器管理番号・機器名・種別から1台登録し、一覧で検索、詳細で編集できます。[項目と範囲](docs/medical-equipment.md)を参照してください。機器詳細から貸出を登録し、返却確認も記録できます。返却後は点検待ちになり、再貸出を止めます。機器詳細で点検を記録し、合格した運用中の機器を再貸出できます。

## セットアップ

必要なもの：Node.js **24.x LTS**（検証版は`.nvmrc`）、npm、Git、PostgreSQL **18.x**。トップページの起動・ビルドだけならDBは不要です。

CLIで生成したアプリのディレクトリで実行します。CLIで依存導入済みならnpm ciは省略できます。nvmを使う場合は先に`nvm install`、`nvm use`を実行します。

```sh
npm ci
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。終了は`Ctrl+C`です。

ポート3000を使用中なら`npm run dev -- --port 3001`で起動できます。

トップページの表示だけではログイン・業務画面は使えません。次のDB準備・Migration・Seed・認証設定を完了してからログインしてください。

外部フォントや外部APIは使いません。依存パッケージとテスト用ブラウザーの初回取得にはインターネット接続が必要です。

## PostgreSQLの準備

[PostgreSQL公式](https://www.postgresql.org/download/)の手順でサーバーとCLIを用意し、起動します。DB管理者として接続できるターミナルで、専用ロールとDBを作ります。必要に応じて`PGHOST`・`PGPORT`・`PGUSER`を設定してください。

```sh
createuser --pwprompt kumuno
createdb --owner=kumuno kumuno
cp .env.example .env.local
```

`.env.local`の`DATABASE_URL`を実際の接続先と作成したパスワードに置き換えます。パスワードに`@`や`#`などがある場合はURLエンコードします。`.env.local`はGit対象外です。DB CLIは`.env.local`を読み、既存の環境変数を優先します。

```sh
npm run db:check
npm run db:migrate
```

`npm ci`時にPrisma Clientを自動生成します。モデル変更後は`npm run db:generate`で再生成します。Migrationの作成には、別の専用DBを指す`SHADOW_DATABASE_URL`も設定してください。shadow DBは再構築されるため、開発・テスト・本番DBと共用しません。モデル変更が必要になった時点で、DB管理者としてcreatedb --owner=kumuno kumuno_shadowを実行して用意します。

MigrationはOrganization・階層Department・User、Better Auth標準テーブル、監査ログ、備品テーブルを作成します。詳しい運用規約は[database.md](docs/database.md)を参照してください。

## 開発用Seed

Migration適用後、アプリの`.env.local`へ`SEED_ALLOW_DEVELOPMENT=true`と`SEED_ADMIN_PASSWORD`（自分で決めた12〜128文字）を設定し、`npm run db:seed`を実行します。接続先が開発用DBであることを確認してください。`NODE_ENV=production`では拒否します。実行後はSeed用設定を削除してください。

サンプル組織、本部→総務部、`admin@example.com`を作成します。固定パスワードはありません。資格情報はBetter Auth標準のハッシュでAccountに保存します。再実行は既存のID・編集内容・パスワードを保持し、パスワード変更には使えません。既存メールとの所属・資格情報の競合時は全体をロールバックします。

このユーザーでログインを試せます。新規作成する開発ユーザーのロールはAdminです。再実行では変更済みロールを保持します。Seedは本番の初期管理者作成には使用しません。

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

**DBや認証・権限・業務更新の変更時には、さらに実PostgreSQLの結合テストを実行します。** DB管理者としてcreatedb --owner=kumuno kumuno_testでテストDBを作ります。`.env.test.local`を作り、専用テストDBを指定します（パスワード部分は自分の設定に置き換えます）。

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
| `npm run test:auth` | 専用DBと3画面幅の認証・管理・備品操作検証（別途必須） |
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

KUMUNOが作成したコードは[MIT License](LICENSE)です。[依存ライブラリの宣言一覧](docs/dependency-licenses.md)も参照してください。

## セットアップで困った場合

| 状況 | 確認すること |
| --- | --- |
| npm ciがNodeのバージョンで失敗する | node --versionで24.xか確認し、nvm use等で切り替える |
| Prisma Clientが見つからない | npm ciを完了する。モデル変更後はnpm run db:generate |
| DB操作でDATABASE_URL未設定と表示される | このアプリ直下の.env.localを設定する |
| test:dbが設定不足で失敗する | .env.test.localに専用TEST_DATABASE_URLを指定する |
| ログインできない | Migration・Seed・入力したパスワード・BETTER_AUTH_SECRETを確認する |
| ポートを変更してログインに失敗 | BETTER_AUTH_URLを実際のOriginへ合わせ、サーバーを再起動する |
| ブラウザーテストが起動しない | Chromiumをインストールし、ポート3100を空ける |

生成アプリの依存・設定・docsはこのディレクトリ内で完結します。KUMUNO開発用リポジトリを参照せず、このREADMEとdocsを基準に保守してください。

## AIと新機能を開発する

[文書一覧](docs/README.md)から[機能追加手順](docs/adding-a-feature.md)と[規約](docs/coding-conventions.md)へ進み、備品管理を参照してください。AGENTS.mdとCLAUDE.mdは同じdocsへの入口です。運用の前提は[deployment.md](docs/deployment.md)を参照してください。

修理は機器詳細の「修理管理」から依頼 → 対応開始 → 完了を記録します。完了後も、台帳で運用中に戻し、合格点検を記録するまで再貸出はできません。

運用のイメージを掴むには「医療機器ダッシュボード」でテストデータ「あり」を選びます。架空の7台を試せます。「なし」に戻すと実データのみを表示し、データは削除しません。

医療機器詳細の「台帳票を印刷 / PDF保存」から、A4の台帳票を開けます。印刷画面でPDF保存も選べます。[印刷の説明](docs/print.md)を参照してください。

医療機器台帳の「現在の条件でCSV出力」で、検索条件とテストデータ選択を反映した全ページのCSVを保存できます。[CSVの説明](docs/csv.md)を参照してください。一括登録は下記の確認付きCSV取込から行えます。

管理権限があれば医療台帳の「CSVから一括登録」で、登録前に全行を確認してから新しい機器を一括登録できます。ひな形を使いUTF-8・100台以内で試してください。既存番号は上書きせず、取込後は点検待ちです。[説明](docs/csv.md)を参照。
