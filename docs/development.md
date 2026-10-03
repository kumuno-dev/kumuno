# KUMUNO本体の開発・検証

この文書はCLIとテンプレートを変更する開発者向けです。以下のコマンドは、特記しない限り製品リポジトリのルートで実行します。生成したアプリを使う場合は、そのアプリ内のREADMEとdocsを参照してください。

## リポジトリのセットアップ

必要なもの：Node.js **24.x LTS**（検証版は`.nvmrc`）、npm、Git、PostgreSQL **18.x**。トップページの起動・ビルドだけならDBは不要です。

リポジトリを取得し、そのディレクトリで実行します。nvmを使う場合は先に`nvm install`、`nvm use`を実行します。

```sh
git clone https://github.com/kumuno-dev/kumuno.git
cd kumuno
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

初回Migrationは履歴作成、後続MigrationはOrganization・Department・User、Better Auth標準テーブル、監査ログと備品テーブルを作成します。詳しい運用規約は[database.md](database.md)を参照してください。

## 開発用Seed

Migration適用後、アプリの`.env.local`へ`SEED_ALLOW_DEVELOPMENT=true`と`SEED_ADMIN_PASSWORD`（自分で決めた12〜128文字）を設定し、`npm run db:seed`を実行します。製品リポジトリでは`templates/default/.env.local`です。接続先が開発用DBであることを確認してください。`NODE_ENV=production`では拒否します。実行後はSeed用設定を削除してください。

サンプル組織、本部→総務部、`admin@example.com`を作成します。固定パスワードはありません。資格情報はBetter Auth標準のハッシュでAccountに保存します。再実行は既存のID・編集内容・パスワードを保持し、パスワード変更には使えません。既存メールとの所属・資格情報の競合時は全体をロールバックします。

このユーザーでログインを試せます。新規作成する開発ユーザーはADMINです。再実行では編集済みのロールを保持します。Seedは本番の初期管理者作成には使用しません。

## ログインを試す

`templates/default/.env.local`に`BETTER_AUTH_URL=http://localhost:3000`と、32文字以上のランダムな`BETTER_AUTH_SECRET`を設定します。秘密鍵は`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`で生成できます。

Migration・開発Seedの実行後、`npm run dev`で起動し、`http://localhost:3000/login`から`admin@example.com`とSeedで指定したパスワードを入力します。ポートやホスト名を変更する場合はBETTER_AUTH_URLも揃えてください。[認証規約](authentication.md)を参照。

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

CLIでOSの一時ディレクトリに生成し、環境変数のDB設定を引き継がず、npm ci・lint・型チェック・単体テスト・本番ビルド・ブラウザーテストを実行します。成功時は一時生成物を削除し、失敗時は確認用に残して場所を表示します。ネットワーク接続とインストール済みChromiumが必要です。npm run checkと同じポート3100を使うため、順に実行してください。配布tgzの検証とは別です。

**CLIの配布物を検証します（npmへ公開しません）。**

```sh
npm run test:pack
```

実tgzをリポジトリ外へインストールし、CLIによる生成・依存導入・dotfile復元・文書リンク・生成アプリのcheckを検証します。

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
npm run test:pack:db
```

test:template:dbはローカルCLI、test:pack:dbは実tgzからインストールしたCLIを使います。test:pack:dbは生成アプリのcheckも実行します。生成アプリの.env.local / .env.test.local経由で接続・MigrationとSeedの初回/再実行・実DB結合テスト・認証ブラウザーテストを確認します。専用DB内の一意なschemaだけを作成・削除し、接続情報を保存した一時ファイルは失敗時も除去します。接続設定なしでは省略せず失敗します。生成に続いてnpm ciを行うためネットワーク接続が必要です。

DB名は`_test`で終わる必要があります。テストは毎回一意なschemaを作成し、それだけを削除します。`DATABASE_URL`への代替接続や、設定なしでのテスト省略は行いません。テストロールには専用DB内でのschema作成権限が必要です。

## CI

[GitHub Actions](../.github/workflows/ci.yml)はmainへのpush、Pull Request、手動実行で起動します。Ubuntu・Node.js 24・専用PostgreSQL 18・Chromiumを用意し、npm run checkとnpm run test:pack:dbを順に実行します。構成・CLI・lint・型・単体・本番ビルド・ブラウザーに加え、配布物からのMigration・Seed・DB・認証・権限・管理画面・備品管理を検証します。

DBの接続先はCI専用サービスです。本番・開発DBやGitHub Secretsは使用しません。依存はlockfileから導入し、公式Actionsはcommit SHAで固定しています。npm公開は実行しません。テストサーバーが同じポートを使うため、ローカルでも各検証コマンドを順に実行してください。

| コマンド | 内容 |
| --- | --- |
| `npm run check:licenses` | 依存ライセンス一覧とlockfileの一致 |
| `npm run licenses:update` | 依存ライセンス一覧を再生成 |
| `npm run check:release` | 公開候補の版・MIT・メタデータ・lockfile一致 |
| `npm run check:structure` | workspace境界・生成アプリ文書の検査 |
| `npm run test:verification` | 専用テストDB設定の回帰検査 |
| `npm run test:cli` | CLI入力・生成・依存導入のテスト |
| `npm run test:pack` | 実tgzから生成したアプリのcheck |
| `npm run test:pack:db` | 実tgzのcheckとDB・認証・業務画面の検証 |
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


## 変更する場所

| 対象 | 場所 |
| --- | --- |
| CLIの入力・生成・依存導入 | packages/create-kumuno/src |
| 同梱ファイル・pack処理 | packages/create-kumuno/src/template-files.mjs、packages/create-kumuno/scripts |
| 生成されるアプリ | templates/default/src、prisma、tests、docs |
| 製品仕様・設計判断 | docs/master-spec.md、docs/decisions |
| 生成・配布・文書検証 | scripts |
| CI | .github/workflows/ci.yml |

packages/create-kumuno/templateはbuild:cli / prepackで再生成する成果物です。直接編集せず、templates/defaultを変更してください。rootとテンプレートの依存・lockfileは独立しています。新しい依存は必要な側だけへ追加し、理由を設計判断へ記録します。

## 問題を切り分ける

| 状況 | 確認すること |
| --- | --- |
| Nodeのバージョンで失敗 | node --versionが24.xか確認。nvm useで切り替える |
| ローカルCLIがtemplateを見つけない | npm run create:appを使う。直接実行なら先にnpm run build:cli |
| Prisma Clientがない | npm run setupを完了する。モデル変更後はnpm run db:generate |
| DB接続設定を認識しない | templates/default/.env.localとシェルの環境変数を確認する |
| DB結合テストが設定不足 | templates/default/.env.test.localに専用TEST_DATABASE_URLを設定する |
| ブラウザーが起動しない | ChromiumとLinuxのシステム依存を導入し、ポート3100を空ける |
| 生成物だけで失敗 | 表示された一時生成物のREADME・package.json・ログを確認する |

失敗した生成物には.env以外の機密データも混入し得るため、Issueへ添付する前に内容を確認してください。DB検証用の接続設定ファイルは検証処理が除去します。[貢献方法](../CONTRIBUTING.md)と[セキュリティ方針](../SECURITY.md)も参照してください。

公開準備は[releasing.md](releasing.md)を参照してください。npm run checkは依存ライセンス一覧と公開メタデータも検査します。


## 公開候補版への機能追加を再現する

[研修追加の受入差分](../examples/training-acceptance/README.md)は公開RC専用。`npm run test:acceptance`でCLIのRegistry取得・生成・差分適用・check、`npm run test:acceptance:db`でMigration / Seedの再実行・実DB・研修と既存機能の3画面幅検証まで再現する。後者には専用TEST_DATABASE_URLが必要。CIの通常checkとは別に実行する。Claude Codeによる理解の確認は[受入記録](acceptance/v0.1.md)の別工程。


## 開発用DBを自動準備して試す

ソース版の生成物は`npm run dev:local`でPostgreSQL 18.4と初期設定を準備できる。[生成物の説明](../templates/default/docs/local-development.md)を参照。npm公開済みrc.1の変更で、旧rc.0には未収録。CLI配布物のこの経路は`npm run test:pack:local`で実際のログイン・備品CRUD・非管理者ロール・同時起動拒否・終了・データ保持と再起動を検証する。CIでは`npm run test:pack:db -- --local`で既存の実DB検証と合わせて実行する。

## 認証パッケージの開発

第1段階の@kumuno/authはpackages/authにあり、npm公開済み0.1.0-rc.0。`npm run build:auth`でtemplates/default/vendor/kumuno-auth-0.1.0-rc.0.tgzへ正式なnpm配布物を作る。既存の別アプリへは、このファイルをコピーしてnpm installする。`npm run test:auth-package`で契約テスト・別ディレクトリへの実tgz導入・公開型を確認する。

パッケージの公開ファイルを変更した場合はbuild:authの後、templates/defaultで`npm install --ignore-scripts @kumuno/auth@file:vendor/kumuno-auth-0.1.0-rc.0.tgz`、rootで`npm run licenses:update`を実行し、配布物・lock・一覧を揃える。root checkは公開ファイルとtgzの一致・SHA-512・lockを検査する。CLIのbundle/prepackも認証配布物を更新する。tgzが変わった状態で古いlockを公開しない。

生成アプリはvendorを含めて単独で動く。公開後のRegistry依存への切り替え、CLIの機能選択は後続。

## 権限パッケージの開発

@kumuno/rbacはpackages/rbacにあり、npm公開済み0.1.0-rc.0。`npm run build:rbac`でvendorの実tgzを作成し、`npm run test:rbac-package`で許可表・拒否条件・別アプリへの導入と公開型を検証する。公開ファイルの変更後はbuild:rbac、templates/defaultで`npm install --ignore-scripts @kumuno/rbac@file:vendor/kumuno-rbac-0.1.0-rc.0.tgz`、rootで`npm run licenses:update`を実行する。CLIのbundle/prepackはauthとrbacを同梱する。audit-logの手順は次節を参照。

## 監査パッケージの開発

@kumuno/audit-logはpackages/audit-logにあり、npm公開済み0.1.0-rc.0。`npm run build:audit-log`でvendorの実tgzを作り、`npm run test:audit-log-package`で操作形状・JSON・writerの失敗伝播・別アプリへの導入と公開型を検証する。公開ファイルの変更後はbuild:audit-log、templates/defaultで`npm install --ignore-scripts @kumuno/audit-log@file:vendor/kumuno-audit-log-0.1.0-rc.0.tgz`、rootで`npm run licenses:update`を実行する。CLI bundle/prepackはauth・rbac・audit-logを同梱する。実DBのロールバック・追記専用制約は引き続き生成アプリのtest:dbで確認する。

## 承認パッケージの開発

@kumuno/approvalはpackages/approvalにあり、npm公開済み0.1.0-rc.0。`npm run build:approval`で実tgzを作成し、`npm run test:approval-package`で遷移・権限・公開型・別アプリへの導入を確認する。`npm run test:approval-package:db`は専用TEST_DATABASE_URLで[PostgreSQL保存例](../examples/approval/README.md)の競合・監査原子性を確認する。DB名の_test検査後、ランダムschemaだけを使う。CIでも実行する。

公開ファイルの変更後はbuild:approval、templates/defaultで`npm install --ignore-scripts @kumuno/approval@file:vendor/kumuno-approval-0.1.0-rc.0.tgz`、rootで`npm run licenses:update`を実行する。CLIにはエンジンを同梱するが、承認UI・DBモデル・業務別の承認条件はまだ追加しない。

## 公開版のRegistry検証

`npm run test:registry-packages`は共通4パッケージをRegistryから新キャッシュで導入し、契約と公開型を確認する。`npm run test:registry:local`はRegistry取得したCLI候補を独立生成・check・開発DB・再起動まで確認する。ソースの版がまだ未公開ならこれらは失敗するため、通常checkとは分離する。[公開記録](releases/2026-10-02-rc1.md)を参照。

## 印刷パッケージの開発

@kumuno/printはpackages/printにあり、0.1.0-rc.0は未公開。`npm run build:print`でvendorの実tgzを作り、`npm run test:print-package`で単体・独立導入・公開型とChromiumでの3画面幅/A4 PDF/改ページを確認する。初回は前述のChromium導入が必要。

公開ファイル変更後はbuild:print、templates/defaultで`npm install --ignore-scripts @kumuno/print@file:vendor/kumuno-print-0.1.0-rc.0.tgz`、rootで`npm run licenses:update`を実行する。ソースのCLI候補0.1.0-rc.2は6パッケージを同梱する。npm公開済みCLI・共通4パッケージは変更していない。[生成アプリの印刷](../templates/default/docs/print.md)を参照。

## CSVパッケージの開発

@kumuno/csvはpackages/csv、0.1.0-rc.0は未公開。`npm run build:csv`でvendorのtgzを作り、`npm run test:csv-package`で形式・上限・独立導入・公開型を確認する。公開ファイル変更後はbuild:csv、templates/defaultで`npm install --ignore-scripts @kumuno/csv@file:vendor/kumuno-csv-0.1.0-rc.0.tgz`、rootで`npm run licenses:update`を実行する。医療台帳の組織境界と読取保持はtest:db、実ダウンロードはtest:authで確認する。[生成アプリの説明](../templates/default/docs/csv.md)を参照。

医療CSVの新規取込はtest:dbで全件と監査の同時保存・全体取消・確認Token・最新権限・同時操作、test:authで3画面幅のアップロード→全行確認→一括登録を検証する。実運用のDBへテスト用CSVを登録しない。
