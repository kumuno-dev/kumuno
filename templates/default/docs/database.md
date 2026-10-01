# Database

## 対象と構成

現在はPostgreSQL 18.xとPrisma 7.10.0の接続・Migration基盤を提供する。共有マスタ・認証モデルと開発Seedを実装済み。セットアップは[README](../README.md)を参照。

| 場所 | 責務 |
| --- | --- |
| `prisma/schema.prisma` | 共有マスタとBetter Auth標準モデル |
| `prisma/migrations/` | レビュー対象のSQLとprovider設定。Gitで管理 |
| `prisma.config.ts` | schema・Migration・接続先のCLI設定 |
| `src/generated/prisma/` | 自動生成Client。Git対象外、npm ci時に生成 |
| `src/database/config.ts` | URL検証とアプリ接続のPool設定 |
| `src/database/connection.ts` | PrismaPg・pg Pool・PrismaClientの生成と終了 |
| `src/database/client.ts` | サーバー専用の遅延初期化・HMR時の共有 |
| `src/database/migrate.ts` | 公式Prisma CLIの実行と診断出力の制限 |
| `scripts/database.ts` | 接続確認・Migration適用CLI |

アプリは`@/database/client`の`getDatabase()`を使う。Client Componentからのimportは`server-only`で拒否する。業務ごとのDB操作はrepositoryに置き、画面や権限ルールへPrisma APIを散在させない。巨大な汎用Repositoryは作らない。複雑な集計にはパラメーター化した生SQLを許可する。

ビルド・トップページの表示・Client生成にDB接続は不要。アプリ接続は最大10、接続待ち5秒、待機接続10秒、SQL30秒、ロック待ち10秒。CLI・テストは`close()`でPrismaClientと外部Poolを閉じる。URLの`schema`はPrismaPgへ渡す。生SQLのテーブルは必要に応じてschemaを明示する（adapterのschema設定だけで生SQLのsearch_pathが変わるとは限らない）。

## 設定

DBコマンドはNode.jsの`--env-file-if-exists=.env.local`を使用し、既存の環境変数を優先する。`DATABASE_URL`が接続先。開発用Migration生成には`SHADOW_DATABASE_URL`も設定する。shadow DBは再構築されるため、開発・テスト・本番DBと必ず別の専用DBを使う。自動作成を使う場合は開発ロールにCREATEDB権限が必要なので、READMEでは管理者が専用shadow DBを作る方式を採用する。

リモート接続は環境に合ったTLS証明書検証を設定する。パスワードはURLエンコードし、環境ファイルをGitへ含めない。TLS接続は現時点で未検証。

接続確認・適用CLIではURL・パスワード・生SQL・DBの生エラーを出力しない。PrismaのP系コードまたはDB/ネットワークコードで診断する。Migrationの内部出力は捕捉し、エラーコードのみ表示する。開発用の生成・復旧コマンドは公式CLIの出力を表示するため、そのログを公開しない。

## Migration

1. `prisma/schema.prisma`を編集する。
2. `npm run db:migration:create -- --name 変更名`でSQLを生成する。開発DBとshadow DBへの接続が必要。
3. SQLの制約・削除動作・既存データへの影響をレビューする。通常のMigrationは明示的な`BEGIN;`と`COMMIT;`で囲む。PrismaはPostgreSQL Migrationを自動でトランザクションに包まない。
4. `npm run db:migrate`で適用し、`npm run db:generate`でClientを再生成する。Prisma 7のmigrate devはClientを自動生成しない。
5. `npm run check`と`npm run test:db`を実行し、関連docsを更新する。

`db:migration:create`は`migrate dev --create-only`であり、開発DBの状態確認と既存Migrationの処理を伴う。空DBへ既存Migrationを適用してから使う。本番DBへ向けない。リセットを要求された場合は自動承認せず、driftの原因と対象データを確認する。

適用は公式`prisma migrate deploy`を使用する。Web起動時の自動適用や`db push`は使わない。本番はバックアップを用意し、DDL権限を持つMigrationロールをアプリ用ロールと分離する。CLIの接続とタイムアウトはPrisma側の管理であり、アプリPool設定は適用されない。公式のadvisory lockを無効化しない。

初回`20260927000000_bootstrap/migration.sql`は`SELECT 1`のみ。`_prisma_migrations`に履歴を作り、業務テーブルは作らない。適用済みファイルは変更せず新しいMigrationを追加する。deployだけでdriftやすべての改変を検出できるとは扱わず、Gitレビューでも不変性を確認する。

失敗すると、明示的トランザクション内のDDL・データは戻るが、Prismaの失敗履歴は残る。後続適用はP3009で停止する。実DBでロールバック済みであることを確認してから、以下で失敗履歴を解決する。

```sh
node --env-file-if-exists=.env.local node_modules/prisma/build/index.js migrate resolve --rolled-back 対象Migration名
```

原因を修正して再適用する。成功済みMigrationを書き換えない。トランザクション外の処理を含む場合は手動で状態を確認・修復してからresolveする。`CREATE INDEX CONCURRENTLY`など通常トランザクションで実行できない処理は別途設計する。

## 検証

`npm run test:unit`はDB不要。`npm run test:db`には専用`TEST_DATABASE_URL`が必須で、DB名は`_test`で終わること。DATABASE_URLへの代替接続や未設定時の省略はしない。

実PostgreSQLにUUID付きschemaを作り、終了時にそのschemaだけを削除する。テストロールにはschema作成権限が必要。接続・パラメーター化SQL・接続失敗時の秘密情報非出力・初回と再適用・データ保持・失敗時のロールバックとresolve・並行適用を確認する。強制終了時は`kumuno_test_`から始まるschemaが残る場合がある。

SQLite・PGlite・モックDBでは代替しない。特定ホスティングサービスやDockerは必須としない。

Milestone 4の`20260928000000_shared_core`は共有マスタ・認証テーブルと外部キーを追加します。自分自身を親部署とするCHECK制約は手動SQLで管理します。Prisma schemaだけから再構築せずMigrationを適用してください。複数部署の循環検証は[部署移動service](organization.md)で行います。

Milestone 5の`20260928010000_auth_rate_limit`はBetter Auth標準DB試行制限のRateLimitを追加する。認証導入時はMigrationを適用してからログインを試す。

その後のMigrationはUser.role、追記専用AuditLog、Equipmentと組織境界の複合外部キーを追加する。モデルと運用は[認可](authorization.md)、[監査](audit-log.md)、[備品](equipment.md)を参照。


手元の試用は[開発用自動セットアップ](local-development.md)を利用できる。既存DB・本番の設定とは別の開発専用経路。
