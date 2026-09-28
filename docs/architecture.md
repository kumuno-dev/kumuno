# 構成と実装工程

## 現在の範囲

最上位仕様は[Master Specification v3.1](master-spec.md)。v0.1のゴールは、npm公開された`create-kumuno`で共通業務基盤と備品管理のReference Applicationを生成し、人とAIが業務機能を追加できること。CLI・生成物の検証・npm公開も完了条件に含む。

旧仕様のStep 1・Step 2は承認済み・実装済み。第3版のMilestone 0として[技術設計案](design/milestone-0.md)を作成した。Milestone 1としてリポジトリをCLI workspaceと独立テンプレートへ再配置した。ユーザーの試用依頼によりローカルCLIの生成処理を先行実装した。npm配布は未対応。既存のPrisma採用決定は維持する。

マスター仕様書はv3.1を正本とし、第2版から継続するCLI・テンプレート・npm公開要件と統合する。原文の章番号の重複・順序ずれのみ補正し、第1〜56章に整理した。第9章・第56章のDB比較については、会話で確定したPrisma採用を本書と選定記録で維持する。第54章の成功指標は、開発者本人以外の利用者がCLIから生成し、AIと業務機能を作れること。

第3版で追加されたShared Core・Business Domain・部署間連携の規約は[domain-boundaries.md](domain-boundaries.md)と[integration.md](integration.md)へ反映した。ID方式・リポジトリ構成・認証・CLI方式などの比較は技術設計案へ記録した。推奨は小さなmonorepo、UUID v4、Zod、同梱Template Copy。認証はユーザー承認によりBetter Authの標準構成・Accountへのハッシュ保存に決定した。Milestone 4でBetter Auth 1.7.6を導入した。

Step 1は実装・検証済み（2026-09-27、macOS arm64、Node.js 24.21.0、npm 11.5.2）。`npm ci`、依存ツリー確認、lint、型チェック、本番ビルド、Playwrightの4件が成功した。開発サーバーでもPC・スマートフォン表示を確認した。他のOS・ブラウザーでの検証は後続工程で行う。

Step 2はユーザー決定によりPrismaへ変更し、実装・検証済み（2026-09-27、Node.js 24.21.0、PostgreSQL 18.4）。単体10件・実DB結合6件・ブラウザー4件、lint・型チェック・本番ビルドが成功した。非管理者ロールでのDBテスト、CLIの接続失敗時の終了コードと秘密情報非出力、SQL生成も確認した。一時PostgreSQLで検証し、本番DBや開発用の永続DBは作成していない。TLS接続と他OSの実行は未検証。

```text
packages/create-kumuno/ CLI local preview（private）
templates/default/           Next.jsアプリ、専用依存・lockfile・docs
scripts/check-structure.mjs  workspaceと独立性の検証
docs/                        製品仕様・設計判断
```

トップページはServer Component。DB接続基盤、共有マスタ、標準認証テーブルと開発Seedを実装済み。Milestone 5でログインフォーム、認証Route Handler、保護ページを追加した。業務管理画面・権限は未実装。外部フォント・AI API・認証SaaSへの接続は不要。Tailwind CSSはPostCSSでビルドする。

Next.jsによるエージェント規約ファイルの自動書き換えは`agentRules: false`で無効化し、プロジェクト規約を手動管理する。フレームワークAPIの確認にはインストール版同梱の`node_modules/next/dist/docs/`を利用する。

## 後続の配置方針（未実装）

`database/`、`authentication/`、`authorization/`、`audit/`は`src/`直下に責務別で置く。業務機能は`src/features/<feature>/`にまとめ、その中でdomain・validation・service・repository・actions・固有UIを分離する。共通UIは`src/components/`に置く。必要な工程で追加し、空の抽象層は先に作らない。

DBはPostgreSQL、アクセス層はPrisma 7.10.0 + adapter-pg + pg、SQL生成・適用はPrisma Migrateを採用済み。詳細は[database.md](database.md)と[選定記録](decisions/0002-postgresql-foundation.md)。認証はBetter Authの標準構成とPrisma adapterを採用する。ハッシュはAccount.passwordに保存し、User.passwordHashは設けない。ユーザー承認に合わせて最上位仕様を更新済み。[認証設計](authentication.md)を参照。依存・標準認証モデルはMilestone 4で導入済み。ログイン・ログアウト・セッション管理を実装済み。

ValidationはZodを候補とする（未導入）。VitestはStep 2から設定・DB基盤の単体・結合テストに使用する。

## 第3版の工程と現在地

旧Step番号と第3版のMilestone番号を混同しない。現在のNext.js基盤はテンプレートとして配置済み。CLI生成物の自動検証を追加した。認証の生成物検証まで完了。権限・業務機能とnpm配布物の検証は未完了。

| Milestone | 内容 | 現在地 |
| --- | --- | --- |
| 0 | 技術設計 | 比較・設計案を作成済み。認証方式・保存先・Prismaは決定済み |
| 1 | Repository構成 | 完了。CLI workspaceと独立テンプレートへ移動し、回帰・単独ビルドを検証 |
| 2 | Template Next.js Application | 完了。Next.js基盤と生成後セットアップを整備し、test:templateで単独検証済み |
| 3 | PostgreSQL / Migration | 完了。CLI生成物の環境ファイル読込・接続・Migration初回/再実行・実DB6件を検証 |
| 4 | Organization / User | 完了。共有マスタ・階層Department・標準認証モデル・開発Seedを検証 |
| 5 | Authentication | 完了。Better Auth・DBセッション・保護ページ・無効ユーザー拒否をCLI生成物でも検証 |
| 6 | Authorization / RBAC | 未実装 |
| 7 | Audit Log | 未実装 |
| 8 | Business UI | Header / Sidebar、ユーザー・部署管理を含め未実装 |
| 9 | Equipment Reference Application | CRUD・検索・ページ・並び替え・認可・監査を含め未実装 |
| 10 | AI Documentation | 入口・基盤・Domain境界・連携規約を作成済み。生成物への同梱は未実施 |
| 11 | create-kumuno CLI | 試用依頼により最小ローカル生成を先行実装。同梱配布・依存インストール対話は未実装 |
| 12 | CLI Integration Test | ローカル生成物のcheckを先行自動化。配布tgz・CIは未実装 |
| 13 | README / OSS Documentation | 第3版のゴールを反映。公開用文書は未完成 |
| 14 | npm package preparation | 名前の利用可能性・ライセンス・公開手順を確認し、npm公開する |
| 15 | v0.1 Release Candidate | 未達。第43〜49章のAcceptance Test A〜Gを確認する |

テストと文書更新は各工程で行い、Milestone 10・12まで後回しにしない。第35章のCIにはlint・typecheck・test・build・CLI生成テストを含める。ユーザー・部署管理は第44章の必須条件。

CLIの目標UXと現在のコマンドは区別する。第3版の例は`.env`だが、現実装のDB CLIは`.env.local`を読む。生成物の環境ファイル・DB準備・Migration・Seedの手順はMilestone 0で整合させ、未実装のSeedやCLIを現在利用可能とは案内しない。

## 旧Step 1の完了条件（実績）

- Node.js 24とREADMEの手順で依存を再現できる。
- `npm run dev`でトップページを表示できる。
- `npm run check`が成功する（lint・型チェック・本番ビルド・スモークテスト）。
- PC・スマートフォンで日本語ページと404からの復帰を確認できる。
- 業務機能、DB、認証の未実装状態をREADMEで明示する。
- 秘密情報・生成物・依存パッケージをGitへ含めない。

## Milestone 1の検証結果

Node.js 24.21.0、macOSでrootのnpm ci、npm run setup、構成検証、lint・型チェック・単体10件・ブラウザー4件・本番ビルドに成功。実PostgreSQL 18.4の結合6件、rootのdb:check / db:migrateと引数転送も確認した。リポジトリ外の一時ディレクトリへ依存・生成物を除いてコピーし、npm ci・型チェック・本番ビルドに成功した。依存監査は0件。一時DBは停止済み。

CLI生成処理・配布tgzからの生成・Windows/Linux・TLSはこの工程では未検証。次はMilestone 2としてテンプレートのセットアップ体験と生成対象の整理を進める。

## ローカルCLI試用

ユーザーの「CLIを試してみたい」という依頼により、Milestone 11の一部を先行した。rootのcreate:appで現在のテンプレートを生成する。名前・既存先・symlinkを検査し、許可したファイルだけをコピーする。生成後にpackageとlockの名前を更新する。自動依存導入・npm公開・完成済み業務機能は含まない。

## Milestone 2の検証結果

Node.js 24.21.0 / macOSでnpm run checkとnpm run test:templateが成功。CLI3件、基盤の単体10件・ブラウザー4件に加え、CLI生成物でもnpm ci・lint・型チェック・単体10件・本番ビルド・ブラウザー4件が成功した。DB設定なしで生成物が動作することを確認。一時生成物は成功後に削除済み。DB接続の生成物検証はMilestone 3、公開tgz・CIはMilestone 12に残る。

## Milestone 3の検証結果

生成アプリ向けtest:template:dbを追加。Node.js 24.21.0 / PostgreSQL 18.4 / macOSで、生成・npm ci・環境ファイル読込・接続・Migration初回/再実行・実DB6件が成功した。不足設定と専用DB以外のURLは生成前に拒否し、URLを出力しないことも確認。npm run checkも成功。一時DB・生成物は検証後に停止・削除する。TLS・他OS・公開tgzの検証は未実施。次はMilestone 4の共有マスタと開発Seed。

## Milestone 4の検証結果

2026-09-28、Node.js 24.21.0 / macOS / PostgreSQL 18.4でnpm run check（CLI3件・単体11件・ブラウザー4件・lint・型検査・本番ビルド）、test:db（10件）、test:template、test:template:dbが成功。生成物のnpm ci、環境ファイル経由のMigration・Seed初回/再実行も成功した。ハッシュの標準verifyPasswordによる検証、更新保持、所属制約、競合時の全体ロールバック、部署の循環と同時変更を検証。npm auditは0件。

一時DBのみで検証し、永続DBへの適用は行っていない。TLS・他OS・ログイン動作・公開tgzは未検証。次はMilestone 5のAuthentication（ログイン・ログアウト・セッション・保護ルート・無効ユーザー拒否）。実装判断は[0009](decisions/0009-shared-core.md)、利用者向け仕様は[organization.md](../templates/default/docs/organization.md)。

## KUMUNO v3.1とCLI名の統一

ブランドを「AIで小さく作る。でも、将来つながる。」へ正式更新。「組む」を人とAIの協働・必要な機能の組み合わせ・将来の業務連携として定義した。CLI package / bin / workspace /生成テストの参照先をcreate-kumunoに統一。旧CLI名は未公開のため互換エイリアスを設けない。過去のdecisionsは履歴として維持する。

Milestone 4までの実装とv0.1の完了条件は維持。この時点の次工程はMilestone 5。npm公開・ライセンス決定・配布tgz検証はまだ未完了。

v3.1更新の検証：2026-09-28、Node.js 24.21.0 / macOSでnpm ci、npm exec --offline -- create-kumuno --help、npm run check、npm run test:templateが成功。CLI3件・単体11件・ブラウザー4件と、生成アプリのクリーンインストール・lint・型検査・本番ビルドを確認した。DB定義・処理は変更していないため実DBテストは再実行していない。npm Registryからの実行・配布tgz・他OSは未検証。


## Milestone 5の検証結果

2026-09-29、Node.js 24.21.0 / macOS / PostgreSQL 18.4でnpm run check（CLI3件・単体12件・ブラウザー4件・lint・型検査・本番ビルド）、test:db（14件）、test:auth、test:template、test:template:dbが成功。CLI生成物でも依存導入・Migration・Seedの再実行、実DB14件、本番ビルドとPC・スマートフォンの認証操作を検証した。DB・認証設定を引き継がない生成物のcheckも成功した。

ログイン・ログアウト、未認証アクセスのリダイレクト、セッション期限、無効ユーザーの拒否とセッション削除、Origin制限、DB共有の試行回数制限を確認。Cookie属性は結合テストで確認した。実TLS接続・本番リバースプロキシ・他OS・公開tgzは未検証。永続DBへの適用は行っていない。

実装判断は[0011](decisions/0011-authentication-implementation.md)、セットアップと制約は[authentication.md](../templates/default/docs/authentication.md)。次はMilestone 6のAuthorization / RBAC。
