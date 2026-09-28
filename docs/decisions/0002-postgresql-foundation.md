# 0002: PostgreSQL接続とPrisma

日付：2026-09-27。対象：承認済みStep 2。ユーザーの明示的な選定によりPrismaを採用する。

## 比較と決定

| 候補 | 利点 | 負担 |
| --- | --- | --- |
| pg + SQL | SQLを直接管理できる | 型とSQLの対応を手動管理する |
| Drizzle | TypeScript定義とSQLに近いAPI | Drizzle API・Migration管理に依存する |
| Prisma | 宣言的モデル、生成Client、統合CLI。保守担当者が好む操作体系 | 専用スキーマと生成工程、開発Migrationのshadow DBが必要 |

PrismaでもSQL Migrationのレビュー・編集と生SQLが可能で、最上位仕様を満たせる。人とAIが保守する目的に照らし、担当者の理解しやすさを重視する。ORM APIはDBアクセス層へまとめる。独自DSLや巨大な汎用Repositoryは作らない。

当初のDrizzle実装は業務テーブル・永続データのない段階で置き換える。Drizzle依存・設定・履歴ファイル・専用overrideは除去した。既存の本番データ移行を伴う変更ではない。

## 依存とバージョン

Prisma CLI・Client・adapter-pgを安定版7.10.0で統一する。npmのlatestタグが8.0.0 RCを指していたため、そのタグには追従しない。Prisma 8の手順を混ぜない。

- prisma / @prisma/client / @prisma/adapter-pg: Apache-2.0。公式CLI・生成Client・pg接続adapter。
- pg / @types/pg: MIT。PostgreSQL Pool管理。
- server-only: MIT。クライアント側へのDB importを拒否。
- tsx / vitest: MIT。TypeScript CLIと単体・実DBテスト。

Prisma CLIの間接依存にnpm auditの指摘があり、`@prisma/config > deepmerge-ts`を8.0.2、`prisma > mysql2`を3.24.4へ限定overrideする。前者は再帰オブジェクトによるスタック枯渇、後者はMySQL認証・圧縮処理の修正。MySQLは本プロジェクトでは使用しない。メジャー更新を含むため、Client生成・設定読込・Migration作成と適用・復旧を実行して互換性を確認する。Prisma更新時にoverrideの必要性を再評価する。

npmのoptional依存欠落を避けるため空ディレクトリでlockfileを生成し、npm ciで再現性を確認する。生成ClientはGit対象外としpostinstallで生成する。生成コードはlint対象外。

## 運用上の選択

接続はPrismaPgと外部pg Pool。遅延初期化によりDBなしのビルドを維持する。適用は公式migrate deployの履歴・ロックを利用し、独自Migrationエンジンは作らない。

通常SQLは明示的トランザクションに包む。失敗履歴を自動消去せず、確認後に公式resolveで復旧する。以前のDrizzleの失敗処理と同じとは扱わない。開発SQL生成は専用shadow DBを使用する。詳細は[database.md](../database.md)。認証方式・業務モデルは変更しない。

## 検証結果

Node.js 24.21.0、PostgreSQL 18.4、macOSで確認。npm ci、依存ツリー整合性、lint、型チェック、本番ビルド、単体10件・実DB6件・ブラウザー4件が成功。非管理者ロールでも実DB6件が成功した。専用の一時開発DB・shadow DBでmigrate dev --create-onlyによるSQL生成、CLIの接続・初回適用・再適用・異常系の終了コードと秘密情報非出力を確認。npm auditは0件。

永続の開発DB・本番DBは作成していない。TLS接続と他OSでの動作は未検証。業務モデル・認証は後続工程。

## 参照

- https://www.prisma.io/docs/orm/v7/prisma-schema/postgresql-extensions
- https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql
- https://www.prisma.io/docs/orm/v7/reference/prisma-cli-reference
- https://github.com/advisories/GHSA-ggr8-5vv4-36mx
- https://github.com/advisories/GHSA-3f6p-5ww8-9rcr
- https://github.com/advisories/GHSA-rgwj-5xj2-c3m3
