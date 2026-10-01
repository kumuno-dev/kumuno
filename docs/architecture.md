# 構成と実装工程

## 現在の範囲

最上位仕様は[Master Specification v3.1](master-spec.md)。v0.1のゴールは、npm公開された`create-kumuno`で共通業務基盤と備品管理のReference Applicationを生成し、人とAIが業務機能を追加できること。CLI・生成物の検証・npm公開も完了条件に含む。

旧仕様のStep 1・Step 2は承認済み・実装済み。第3版のMilestone 0として[技術設計案](design/milestone-0.md)を作成した。Milestone 1としてリポジトリをCLI workspaceと独立テンプレートへ再配置した。ユーザーの試用依頼によりローカルCLIの生成処理を先行実装した。テンプレート同梱とtgzの独立生成は対応済み。npm Registryへ0.1.0-rc.0を公開済み。既存のPrisma採用決定は維持する。

マスター仕様書はv3.1を正本とし、第2版から継続するCLI・テンプレート・npm公開要件と統合する。原文の章番号の重複・順序ずれのみ補正し、第1〜56章に整理した。第9章・第56章のDB比較については、会話で確定したPrisma採用を本書と選定記録で維持する。第54章の成功指標は、開発者本人以外の利用者がCLIから生成し、AIと業務機能を作れること。

第3版で追加されたShared Core・Business Domain・部署間連携の規約は[domain-boundaries.md](domain-boundaries.md)と[integration.md](integration.md)へ反映した。ID方式・リポジトリ構成・認証・CLI方式などの比較は技術設計案へ記録した。推奨は小さなmonorepo、UUID v4、Zod、同梱Template Copy。認証はユーザー承認によりBetter Authの標準構成・Accountへのハッシュ保存に決定した。Milestone 4でBetter Auth 1.7.6を導入した。

Step 1は実装・検証済み（2026-09-27、macOS arm64、Node.js 24.21.0、npm 11.5.2）。`npm ci`、依存ツリー確認、lint、型チェック、本番ビルド、Playwrightの4件が成功した。開発サーバーでもPC・スマートフォン表示を確認した。他のOS・ブラウザーでの検証は後続工程で行う。

Step 2はユーザー決定によりPrismaへ変更し、実装・検証済み（2026-09-27、Node.js 24.21.0、PostgreSQL 18.4）。単体10件・実DB結合6件・ブラウザー4件、lint・型チェック・本番ビルドが成功した。非管理者ロールでのDBテスト、CLIの接続失敗時の終了コードと秘密情報非出力、SQL生成も確認した。一時PostgreSQLで検証し、本番DBや開発用の永続DBは作成していない。TLS接続と他OSの実行は未検証。

```text
packages/create-kumuno/ CLI + bundled template（公開候補版）
templates/default/           Next.jsアプリ、専用依存・lockfile・docs
scripts/check-structure.mjs  workspaceと独立性の検証
docs/                        製品仕様・設計判断
```

トップページはServer Component。DB接続基盤、共有マスタ、標準認証テーブルと開発Seedを実装済み。Milestone 5でログインフォーム、認証Route Handler、保護ページを追加した。Milestone 6で3ロールの共通認可、Milestone 7で業務更新と同時に保存する監査ログを追加した。Milestone 8で共通画面とユーザー・部署管理を追加した。外部フォント・AI API・認証SaaSへの接続は不要。Tailwind CSSはPostCSSでビルドする。

Next.jsによるエージェント規約ファイルの自動書き換えは`agentRules: false`で無効化し、プロジェクト規約を手動管理する。フレームワークAPIの確認にはインストール版同梱の`node_modules/next/dist/docs/`を利用する。

## Featureの配置と実装方針

`database/`、`authentication/`、`authorization/`、`audit/`は`src/`直下に責務別で置く。実際の参照実装は`src/equipment/`で、validation・service・repository・actions・固有UIを分離する。新機能も`src/<feature>/`へ置く。共通フォームは`src/management/form.tsx`を再利用する。空の抽象層は先に作らない。

DBはPostgreSQL、アクセス層はPrisma 7.10.0 + adapter-pg + pg、SQL生成・適用はPrisma Migrateを採用済み。詳細は[database.md](database.md)と[選定記録](decisions/0002-postgresql-foundation.md)。認証はBetter Authの標準構成とPrisma adapterを採用する。ハッシュはAccount.passwordに保存し、User.passwordHashは設けない。ユーザー承認に合わせて最上位仕様を更新済み。[認証設計](authentication.md)を参照。依存・標準認証モデルはMilestone 4で導入済み。ログイン・ログアウト・セッション管理を実装済み。

Validationは当初Zodを候補としたが、Milestone 8では少数のFormDataに通常のTypeScript検証を採用した。[0014](decisions/0014-business-ui.md)を参照。VitestはStep 2から設定・DB基盤の単体・結合テストに使用する。

## 第3版の工程と現在地

旧Step番号と第3版のMilestone番号を混同しない。現在のNext.js基盤はテンプレートとして配置済み。CLI生成物の自動検証を追加した。認証の生成物検証まで完了。共通認可・管理画面・備品管理を実装済み。npm配布物の生成・check・DB/認証検証を実装し、CIを追加した。

| Milestone | 内容 | 現在地 |
| --- | --- | --- |
| 0 | 技術設計 | 比較・設計案を作成済み。認証方式・保存先・Prismaは決定済み |
| 1 | Repository構成 | 完了。CLI workspaceと独立テンプレートへ移動し、回帰・単独ビルドを検証 |
| 2 | Template Next.js Application | 完了。Next.js基盤と生成後セットアップを整備し、test:templateで単独検証済み |
| 3 | PostgreSQL / Migration | 完了。CLI生成物の環境ファイル読込・接続・Migration初回/再実行・実DB6件を検証 |
| 4 | Organization / User | 完了。共有マスタ・階層Department・標準認証モデル・開発Seedを検証 |
| 5 | Authentication | 完了。Better Auth・DBセッション・保護ページ・無効ユーザー拒否をCLI生成物でも検証 |
| 6 | Authorization / RBAC | 完了。3ロール・共通認可・組織境界・最新ロール取得を検証 |
| 7 | Audit Log | 完了。部署移動・ユーザー無効化の同時保存、失敗時の全体取消、追記専用履歴を検証 |
| 8 | Business UI | 完了。共通Header / Sidebarとユーザー・部署管理を3画面幅で検証 |
| 9 | Equipment Reference Application | 完了。CRUD・検索・ページ・並び替え・認可・監査を生成物でも検証 |
| 10 | AI Documentation | 完了。必須文書・共通入口・機能追加手順を生成物に同梱し、欠落・リンクを検証 |
| 11 | create-kumuno CLI | 完了。同梱配布・依存インストール対話・失敗時の保持を検証済み |
| 12 | CLI Integration Test | 完了。配布tgzのDB/認証結合検証とUbuntu上のGitHub Actionsが成功 |
| 13 | README / OSS Documentation | 完了。導入・開発・貢献・セキュリティ・変更履歴とIssue/PR文書を整備 |
| 14 | npm package preparation | 完了。MIT・公開候補版のnpm公開・Registryからの生成とDB/認証検証が成功 |
| 15 | v0.1 Release Candidate | 進行中。A〜D / F / Gを検証し、EのClaude Code確認は後日 |

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


## Milestone 6の検証結果

2026-09-29、Node.js 24.21.0 / macOS / PostgreSQL 18.4でnpm run check（CLI3件・単体14件・ブラウザー4件・lint・型検査・本番ビルド）、test:template、test:template:dbが成功した。生成物の実DB15件とPC・スマートフォンの認証操作も成功。新規Userの既定ロール、Seedの降格保持、同一セッションへの最新ロール反映、クライアント入力による昇格拒否、許可表・組織境界を検証した。

既存ユーザーのMigration既定値はUSER。開発Seedで新規作成する管理者だけADMIN。ロール変更画面、細分化データスコープ、本番初期管理者プロビジョニングは未実装。永続DBは変更していない。実TLS・本番プロキシ・他OS・公開tgzは未検証。

[認可仕様](authorization.md)と[設計判断0012](decisions/0012-authorization.md)を追加した。次はMilestone 7のAudit Log。


## Milestone 7の検証結果

2026-09-29、Node.js 24.21.0 / macOS / PostgreSQL 18.4でnpm run check（CLI3件・単体16件・ブラウザー4件・lint・型検査・本番ビルド）、test:template、test:template:dbが成功。生成物でMigration・Seed再実行、実DB19件、PC・スマートフォンの認証操作が成功した。監査保存の強制失敗による業務更新・セッション削除のロールバック、権限・組織境界、無変更時の非重複、CREATE/DELETEの記録、履歴のUPDATE/DELETE/TRUNCATE拒否と操作者削除後の保持を検証した。

監査は既存の部署移動・ユーザー無効化へ組み込んだ。ログ閲覧画面・公開API・保存期限による削除は未実装。永続DBへのMigration適用は行っていない。実TLS・本番プロキシ・他OS・公開tgzは未検証。一時DBは検証後に終了する。

[監査仕様](audit-log.md)と[設計判断0013](decisions/0013-audit-log.md)を追加。次はMilestone 8のBusiness UI（Header / Sidebar、ユーザー・部署管理）。


## Milestone 8の検証結果

2026-10-01、Node.js 24.21.0 / macOS / PostgreSQL 18.4でnpm run check、test:template、test:template:dbが成功。CLI3件、単体18件、基本ブラウザー4件、生成物の実DB23件が成功した。lint・型検査・本番ビルドに加え、PC1280px・タブレット768px・スマートフォン390pxでユーザー／部署登録・編集・無効化／再有効化・部署削除・参照ロール制限・古い管理フォームからの書込拒否を検証した。画像でPC・スマートフォンのレイアウトを確認した。

新規ユーザーのBetter Authログイン、Account／監査保存の原子性、越境拒否、親部署循環・関連部署削除拒否、管理者同士の同時降格でも管理者を残すことを実DBで確認した。フォームのラベルと補足説明は分離した。

新規依存・DB Migrationは追加していない。永続DBは変更していない。パスワードリセット／変更強制・通知、大規模一覧の検索／ページング、実TLS・本番プロキシ・他OS・配布tgzは未検証または未実装。認可不足ページはデータを出さず案内を表示するがHTTP 403応答ではない。

[管理画面仕様](management.md)と[設計判断0014](decisions/0014-business-ui.md)を追加。次はMilestone 9のEquipment Reference Application。


## Milestone 9の検証結果

2026-10-01、Node.js 24.21.0 / macOS / PostgreSQL 18.4で構成検証・CLI3件、生成物のlint・型検査・単体21件・基本ブラウザー4件・本番ビルドが成功。test:template:dbでMigration初回／再実行とSeed再実行、実DB27件が成功した。生成物のPC1280px・タブレット768px・スマートフォン390pxで備品CRUD・削除後404・検索・ページ切替・価格順・Userの更新操作非表示／登録URL拒否が成功した。既存のユーザー・部署管理と認証も回帰検証した。PCとスマートフォンの画面画像を確認した。

購入日・価格の検証、正確なDecimal、部署・担当者の組織境界、Manager更新、検索・安定した並び順、監査保存失敗時のCRUD取消を実DBで確認した。購入価格は円として扱う。担当者の所属部署と備品の所属部署は独立して指定できる。

新規依存はない。Equipmentと複合外部キーのMigrationを追加したが永続DBへの適用は行っていない。大量データ性能、実TLS、本番プロキシ、他OS、配布tgzは未検証。

[備品管理仕様](equipment.md)と[設計判断0015](decisions/0015-equipment-reference.md)を追加。次はMilestone 10のAI Documentation。


## Milestone 10の検証結果

2026-10-01、Node.js 24.21.0 / macOSでnpm run check、test:templateが成功。必須文書17ファイルとdocs内のローカルファイルリンク、製品仕様や端末固有パスに依存しないことをテンプレートとCLI生成物の両方で検証した。CLI3件、単体21件、基本ブラウザー4件、lint・型検査・本番ビルドが成功した。

AGENTS.md / CLAUDE.mdは同じdocsを読む入口へ統一。adding-a-featureに仕様書の10段階、coding-conventionsに設計・入力・認可・監査・エラーの規約を記載。Domain境界・連携・deploymentを生成物内で完結する内容にした。現在のsrc/equipment配置と共通機能に合わせ、古いID未決定・権限未実装の説明を修正した。

文書と製品側の生成検証を変更し、アプリ処理・DB・依存は変更していないため実DB27件はこの工程では再実行していない。AIが実際に研修機能を追加するAcceptance Test D / E、公開tgz、本番デプロイは未実施。

[設計判断0016](decisions/0016-ai-documentation.md)と[生成アプリの文書一覧](../templates/default/docs/README.md)を参照。次はMilestone 11のcreate-kumuno CLI（同梱配布とセットアップUX）。


## Milestone 11 完了（2026-10-01）

create-kumunoに独立したテンプレートを同梱し、リポジトリ外でもアプリを生成できる。対話での名前入力・依存導入選択と、--install / --no-install / --yesに対応した。導入失敗時は生成物を保持し、再試行手順を案内する。詳細は[設計判断0017](decisions/0017-cli-bundled-template.md)を参照。

Node.js 24 / macOSでnpm run checkとnpm run test:packが成功。CLIテスト5件、生成アプリの単体21件・ブラウザー4件、lint・型検査・本番ビルドを確認した。97ファイルの実tgzを一時ディレクトリにインストールし、インストール済みCLIからの生成・npm ci・dotfile復元・文書リンク検査を確認した。対話での依存導入スキップと、導入失敗時のファイル保持も確認済み。

新規依存・DB変更はないため実DBテストは再実行していない。npm公開、Windows/Linux実行、配布物からのDB結合テストとCIは未実施。次はMilestone 12としてCLI結合テストとCIを進める。


## Milestone 12 完了（2026-10-01）

実tgzをリポジトリ外へインストールし、生成物のcheckとDB結合検証を行うtest:pack:dbを追加した。GitHub ActionsはUbuntu・Node.js 24・専用PostgreSQL 18・Chromiumでcheckとtest:pack:dbを順に実行する。詳細は[設計判断0018](decisions/0018-packed-cli-integration-ci.md)を参照。

macOS / Node.js 24 / 一時PostgreSQL 18.4の非管理者ロールでnpm run checkとnpm run test:pack:dbが成功。CLI5件・検証設定1件・単体21件・ブラウザースモーク4件、生成物のMigration/Seed初回と再実行、実DB27件、PC/タブレット/スマートフォンでの認証・権限・管理画面・備品CRUDが成功した。永続DB変更・新規依存・npm公開は行っていない。[初回GitHub Actions](https://github.com/kumuno-dev/kumuno/actions/runs/36798463180)も成功（実装commit: 3bac108）。Ubuntu上でcheckとtest:pack:dbが通り、配布物からのDB・認証・業務画面まで確認した。DB検証を意図的に途中で失敗させたローカル確認でも、mode 0600の資格情報ファイル・schemaの除去と接続終了を確認済み。Windowsとnpm Registry経由は未検証。次はMilestone 13のREADME / OSS Documentation。


## Milestone 13 完了（2026-10-01）

READMEをブランドの思想・未公開状態・ローカルQuick Start・現在の機能・参加方法へ整理した。本体の詳細手順は[開発ガイド](development.md)、文書の入口は[文書一覧](README.md)へ移した。[貢献方法](../CONTRIBUTING.md)、[セキュリティ方針](../SECURITY.md)、[変更履歴](../CHANGELOG.md)、Issue / PRテンプレートを追加した。生成アプリREADMEと古いDB・認証の実装状況も修正した。[設計判断0019](decisions/0019-oss-documentation.md)を参照。

Node.js 24 / macOSでnpm run checkとnpm run test:packが成功。CLI5件・検証設定1件・単体21件・ブラウザー4件、配布物の独立生成・依存導入・生成アプリの文書リンク・lint・型検査・本番ビルドを確認した。変更文書のローカルリンクとnpmコマンドも確認した。

文書のみの変更で、DB・依存・アプリ動作は変更していないため、実DB検証は再実行していない。ライセンスと固定の非公開報告窓口の確定、npm公開、Windows・Registry経由の確認は残る。次はMilestone 14のnpm package preparation。


## Milestone 14 公開準備（2026-10-01）

ユーザー承認によりMITを採用し、root・CLI・生成アプリへLICENSEとpackageメタデータを反映した。CLIはcreate-kumuno@0.1.0-rc.0、npm公式registry / public / nextタグとし、rootと生成アプリのprivateは維持した。[公開手順](releasing.md)、[依存ライセンス記録](dependency-licenses.md)、[設計判断0020](decisions/0020-npm-release-preparation.md)を追加した。

lockfileの全497依存項目にライセンス宣言があること、直接依存24件のpackage.jsonと同梱許諾文22件を確認した。依存の版・resolved・integrityは変更していない。LICENSEと依存宣言一覧を生成物に含め、配布物でも一致を検証する。

Node.js 24 / macOS / 一時PostgreSQL 18.4の非管理者ロールでcheck、test:pack、test:pack:dbが成功。CLI5件・検証設定1件・単体21件・ブラウザー4件、実DB27件、3画面幅の認証・権限・管理・備品操作が通った。公開候補tgzは101ファイル、138,669 bytes。固定したtgzとnpm publish --dry-runのSHA-512 integrityが一致した。実公開は行っていない。

npm名照会はE404で、利用可能性は公開時に再確認する。Macのnpm whoamiはENEEDAUTH、GitHubはprivate。npm認証、GitHubのpublic切替・非公開報告窓口の確定、候補版の実公開とRegistry経由の検証が未完了のため、Milestone 14全体は完了扱いにしない。公開設定の変更・npm公開はメンテナー確認後に進める。

公開候補の[GitHub Actions](https://github.com/kumuno-dev/kumuno/actions/runs/36800486776)も成功（実装commit: 34290db）。Ubuntuで公開メタデータ・依存ライセンス・配布物のDB/認証/業務画面まで検証した。実公開とGitHub可視性の変更は確認待ち。


## GitHub一般公開とnpm公開試行（2026-10-01）

ユーザーがGitHubのpublic切替と候補版のnpm公開を明示承認した。kumuno-dev/kumunoをpublicへ切り替え、非公開脆弱性報告を有効化・確認した。npmログインも確認済み。固定tgzをnextタグで公開しようとしたが、npmアカウントの2FAが無効で403となった。npm名照会は引き続きE404で、実公開は未完了。承認は維持し、メンテナーの2FA設定完了後に再試行・Registry検証を行う。


## Milestone 14 完了（2026-10-01）

ユーザーの2FA設定後、公開操作の本人確認を経てcreate-kumuno@0.1.0-rc.0をnextタグでnpmへ公開した。Registryのdist.integrityは検証済みの固定tgzと一致した。新しいnpmキャッシュを使い、リポジトリ外でnpx create-kumuno@nextから生成・依存導入し、文書・lint・型・単体21件・本番ビルド・ブラウザー4件を確認した。一時PostgreSQL 18.4の非管理者ロールでMigration/Seed再実行・実DB27件・3画面幅の認証/認可/管理/備品操作も成功した。

初回公開でlatestも候補版を指し、タグ削除はnpm側が400で拒否した。現在のnext / latestはともに0.1.0-rc.0で、試用には@nextを明示する。安定版の公開完了とは扱わない。GitHubはpublic、非公開脆弱性報告も有効。次はMilestone 15としてAcceptance Test A〜Gとv0.1 Release Candidateを確認する。


## Milestone 15の受入検証（2026-10-01）

公開RCから生成したアプリで、Codexが独立Training Featureを追加した。既存User / Departmentを再利用し、Prisma Migration・Validation・Permission・安全な監査snapshot・CRUD画面・テスト・生成物のdocsを実装した。標準テンプレートにはTrainingを追加していない。[受入記録](acceptance/v0.1.md)と[差分・再現手順](../examples/training-acceptance/README.md)を参照。

生成物の単体24件・実DB32件・スモーク4件、lint・型検査・本番ビルドと3画面幅の研修／既存機能のブラウザー検証が成功した。既存データの保持、監査INSERT失敗時のCRUD取消、越境拒否、権限降格後の古いフォーム拒否を確認した。

ユーザーがClaude Codeの確認を後日へ指定したため、EはCodex側のみ確認済み。Milestone 15 / A〜G全体の完了と正式版公開は保留する。0.1.0-rc.0と現在のnpmタグは変更していない。正式版は受入完了後に0.1.0をlatestで公開・Registry検証する方針。


## 開発用DBの自動準備（rc.1候補）

ユーザー承認により、手元の試用を本番DB構築から分けた。生成アプリのdev:localが専用PostgreSQL 18.4を起動し、DB / shadow DB / test DB、ランダム資格情報、認証設定、Migrationと開発用初期管理者、Next.js開発サーバーを準備する。既存.env.localや接続環境変数は拒否して上書きせず、通常のDB接続は維持する。Ctrl+Cで停止し、データ・初期管理者ID・パスワードは再起動でも保持する。

[設計判断0022](decisions/0022-local-development-postgres.md)と[生成物の手順](../templates/default/docs/local-development.md)を参照。embedded-postgresを開発依存として追加し、ライセンス宣言全507項目を更新した。新しいCLI候補は0.1.0-rc.1。現在のnpm公開版rc.0とタグは変更していない。正式版とClaude Codeの確認条件も維持する。

配布物の自動起動・実ログイン・備品CRUD・非管理者ロール・同時起動拒否・終了・既存ID／備品／監査を保持した再起動をmacOSで検証した。単体24件・実DB27件・3画面幅の認証／認可／管理／備品・ブラウザースモーク4件・lint・型・本番ビルドとCLI5件も成功。rc.1の実tgzでtest:pack:db -- --localが成功した。CIへ同じ起動検証を追加した。Windowsの実行は未検証。


自動セットアップ追加の[GitHub Actions](https://github.com/kumuno-dev/kumuno/actions/runs/36811013393)も成功（実装commit: 87af3c9）。Ubuntuで従来の配布物・実DB・3画面幅の業務検証に加え、専用PostgreSQLの初回起動・ログイン・CRUD・終了・再起動を確認した。公開候補rc.1の固定tgzは106ファイル、146,109 bytesで、dry-runとSHA-512 integrityが一致し、.kumuno / 実.env / node_modulesは含まれない。npm認証は確認済み、実公開はメンテナーの確認待ち。

## 医療機器管理の第一段階

ユーザーの指定サイトとExcel運用をもとに、ソース版へ医療機器台帳を追加した。MedicalDeviceは業務固有モデルで、共通の組織・部署・権限・監査を再利用する。登録・編集・詳細・検索・状態フィルター・ページ切替を提供する。ADMIN/MANAGERは管理、USERは参照。既存生成アプリは自動更新しない。npm公開には未収録。

貸出・返却・点検・修理は後続。[設計案](design/medical-equipment-template.md)、[判断0023](decisions/0023-medical-device-ledger.md)、[実装仕様](../templates/default/docs/medical-equipment.md)を参照。CLIの医療テンプレート選択は未実装。

医療機器台帳の検証（2026-10-01、macOS arm64 / Node.js 24.21.0 / PostgreSQL 18.4）: root check成功、配布物からの生成チェック（単体26件・スモーク4件）、実DB32件、本番ビルド、PC/タブレット/スマートフォンの登録・編集・検索・番号重複・最新権限の拒否が成功。既存6Migrationからのデータ保持、dev:localでの台帳と監査の停止/再起動後の保持も成功。`npm run test:pack:db -- --local`の配布検証は117ファイルで成功。Linuxでの今回の変更と実施設の点検・貸出運用は、この時点では未確認。

## 医療機器の貸出・返却

第二段階としてMedicalLoan、貸出中/返却済み一覧、機器詳細の貸出/返却操作を追加。所有部署と貸出先を区別し、組織内の部署・Userを再利用する。部分一意制約で二重貸出を防ぎ、返却後は点検待ちとして再貸出を止める。点検と解除処理は後続。[判断0024](decisions/0024-medical-device-loans.md)と[台帳仕様](../templates/default/docs/medical-equipment.md)を参照。npm公開・既存生成アプリへの自動適用は行わない。

貸出・返却の検証（2026-10-01、macOS arm64 / Node.js 24.21.0 / PostgreSQL 18.4）: root check、配布物の単体27件・スモーク4件、実DB39件、本番ビルド、3画面幅の貸出/返却/履歴/権限変更後の保存拒否が成功。二重貸出・同時返却・越境・監査失敗時の全体取消、既存7Migrationの医療台帳を保持した追加適用、search_pathを手動設定しない生成アプリ接続、停止/再起動後の貸出・返却・点検待ち・監査保持を確認した。配布物122ファイルのtest:pack:db -- --localが成功。今回のLinux/Windows実行と施設固有の点検運用は未確認。

## 医療機器の点検記録と再貸出

第三段階としてMedicalInspection、機器詳細の点検フォーム、検索・結果別一覧を追加。合格した運用中の機器のみ点検待ちを解除し、不合格・未完了は再貸出を止める。古いフォーム・同時操作を拒否する。[判断0025](decisions/0025-medical-device-inspections.md)と[実装仕様](../templates/default/docs/medical-equipment.md)を参照。npm公開は行わない。

点検の検証（2026-10-01、macOS arm64 / Node.js 24.21.0 / PostgreSQL 18.4）: root check、配布物の単体28件・スモーク4件・実DB46件、本番ビルド、3画面幅の返却→不合格→合格→再貸出が成功。最新権限、越境、古い点検フォーム・同時保存の拒否、監査失敗時の全体取消、既存8Migrationからの履歴保持、再起動後の点検記録・貸出可否・監査保持を確認した。配布物127ファイルのtest:pack:db -- --localが成功。最終的な直近返却の選択と単調に進む点検の版は、関連実DB3件で追加確認した。

試用中のmedical-loan-demoは停止後にDBと設定を非公開バックアップへ保存し、追加Migrationとコードを反映して同じ55072ポートで再起動した。更新前後の共通マスタ・医療機器・貸出・監査の件数/ハッシュが一致した。既存履歴の一括補正は実施せず、読み取りの時刻互換処理を採用した。Linux/Windowsの今回の実行、施設固有の点検表と判定基準は未確認。

## 医療機器の修理管理

第四段階としてMedicalRepair、機器詳細の修理依頼・対応開始・完了と、状態別検索一覧を追加。修理中は貸出・点検・運用再開・廃棄を拒否する。完了後も運用停止・点検待ちを維持し、台帳の運用再開と合格点検を必要とする。[判断0026](decisions/0026-medical-device-repairs.md)を参照。npm公開は行わない。

修理管理の検証（2026-10-01、macOS arm64 / Node.js 24.21.0 / PostgreSQL 18.4）: root check、配布物の単体29件・実DB52件・スモーク4件、本番ビルド、3画面幅の修理依頼→対応開始→完了→台帳の運用再開→合格点検→再貸出が成功。二重依頼・同時開始・越境・最新権限・無効ユーザー・修理中の禁止操作・監査失敗時の取消・既存9Migrationからのデータ保持を確認した。修理完了日より前の合格点検による解除も拒否する。停止/再起動後の修理履歴・再貸出可否・監査保持を含む132ファイルのtest:pack:db -- --localが成功。Linux/Windowsでの今回の実行と施設固有の修理・点検手順は未確認。

試用中のmedical-loan-demoは停止状態のDBと設定を非公開バックアップへ保存し、追加Migrationとコードを反映して同じ55072ポートで再起動した。更新前後のOrganization・Department・User・MedicalDevice・MedicalLoan・MedicalInspection・AuditLogの件数/ハッシュが一致し、既存データと資格情報を維持した。実サイトのログインと修理一覧表示も確認した。

## 任意のテストデータと医療ダッシュボード

ユーザーの指示により、テストデータの選択と架空7台の運用例を追加。その次工程として状態別台数と直近の点検予定を表示する医療ダッシュボードを実装した。[判断0027](decisions/0027-medical-sample-data.md)、[判断0028](decisions/0028-medical-overview.md)を参照。npm公開・データ削除・リセットは行わない。

検証（2026-10-01、macOS arm64 / Node.js 24.21.0 / PostgreSQL 18.4）: root check、配布物の単体29件・実DB58件・スモーク4件、本番ビルド、PC/タブレット/スマートフォンでの表示切り替え・重複なしの再表示・台数からの一覧遷移が成功。既存機器保持、番号競合/監査失敗時の全体取消、最新権限・組織境界、状態分類の合計と一覧件数の一致、直近記録による点検予定、停止/再起動後の架空データ・実データ・監査保持を確認。140ファイルのtest:pack:db -- --localが成功。Linux/Windowsでの今回の実行、大規模台帳の性能、施設固有の点検基準は未確認。

選択欄が切り替え後の現在値と一致することは、最終コードの本番ビルドと3画面幅の認証付き操作テストで追加確認した。

試用中のmedical-loan-demoを停止後に非公開バックアップし、同じ55072ポートで更新した。Organization・Department・User・MedicalDeviceの既存列・MedicalLoan・MedicalInspection・MedicalRepair・AuditLogの件数/ハッシュが更新前後で一致。既存機器のisSampleはfalseで、架空データはユーザーが「あり」を選ぶまで追加しない。DB・設定・ログイン資格情報を保持した。

## 組合せ型KUMUNOへの第1段階

@kumuno/authへBetter Authの設定とHTTP入口の保護を抽出。アプリはadapterと最新の有効ユーザー照合を渡し、Prisma schema・業務照合・RBAC・監査・UIを所有する。未公開パッケージは自己完結するtgzをCLIへ同梱する。[判断0029](decisions/0029-auth-package.md)、[全体構成](package-architecture.md)を参照。npm公開は行わない。

第1段階の検証（2026-10-01、macOS / Node.js 24.21.0 / PostgreSQL 18.4）: 認証パッケージ単体4件、別アプリへの実tgzインストール・実行時import・公開型の確認が成功。root check、CLI5件、生成物の単体29件・実DB58件・スモーク4件、本番ビルド、3画面幅のログイン/ログアウト・最新権限・無効化・医療機器の貸出/点検/修理・テストデータ選択が成功。141ファイルのtest:pack:db -- --localで、親リポジトリなしの依存導入と開発DB起動・停止・再起動後の業務データ/監査保持も確認した。配布物とソース・lockのSHA-512一致を継続チェックへ追加した。npm Registryへの公開、Prisma以外のadapter、今回のLinux/Windows実行は未確認。試用中の既存アプリは自動更新しない。

## 共通パッケージの第2段階（2026-10-02）

@kumuno/rbacへ3ロール・組織境界・基本6権限とForbiddenErrorを抽出。DB・フレームワークへの依存はなく、業務固有Permissionはアプリ側で明示的に追加する。既存の最新操作者照合とtransaction境界を維持し、DBモデルの変更はない。実tgzを生成テンプレートへ同梱する。公開は別工程。[設計判断](decisions/0030-rbac-package.md)を参照。

第2段階の検証（macOS arm64、Node.js 24.21.0）：root check、RBAC契約4件・別アプリへの実tgz導入・TypeScript・Nodeのimport/require、配布CLI142ファイルからの独立生成とnpm ci、本番ビルド、単体29件、実DB58件、基本ブラウザー4件、3画面幅の認証・管理・備品・医療業務、開発用PostgreSQLの自動準備・終了・再起動とデータ保持が成功。新パッケージのLinux / Windows実行とnpm公開は未実施。試用アプリのDBは変更していない。
