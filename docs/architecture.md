# 構成と実装工程

## 現在の範囲

最上位仕様は[Master Specification v3.1](master-spec.md)。v0.1のゴールは、npm公開された`create-kumuno`で共通業務基盤と備品管理のReference Applicationを生成し、人とAIが業務機能を追加できること。CLI・生成物の検証・npm公開も完了条件に含む。

旧仕様のStep 1・Step 2は承認済み・実装済み。第3版のMilestone 0として[技術設計案](design/milestone-0.md)を作成した。Milestone 1としてリポジトリをCLI workspaceと独立テンプレートへ再配置した。ユーザーの試用依頼によりローカルCLIの生成処理を先行実装した。テンプレート同梱とtgzの独立生成は対応済み。npm Registryは未公開。既存のPrisma採用決定は維持する。

マスター仕様書はv3.1を正本とし、第2版から継続するCLI・テンプレート・npm公開要件と統合する。原文の章番号の重複・順序ずれのみ補正し、第1〜56章に整理した。第9章・第56章のDB比較については、会話で確定したPrisma採用を本書と選定記録で維持する。第54章の成功指標は、開発者本人以外の利用者がCLIから生成し、AIと業務機能を作れること。

第3版で追加されたShared Core・Business Domain・部署間連携の規約は[domain-boundaries.md](domain-boundaries.md)と[integration.md](integration.md)へ反映した。ID方式・リポジトリ構成・認証・CLI方式などの比較は技術設計案へ記録した。推奨は小さなmonorepo、UUID v4、Zod、同梱Template Copy。認証はユーザー承認によりBetter Authの標準構成・Accountへのハッシュ保存に決定した。Milestone 4でBetter Auth 1.7.6を導入した。

Step 1は実装・検証済み（2026-09-27、macOS arm64、Node.js 24.21.0、npm 11.5.2）。`npm ci`、依存ツリー確認、lint、型チェック、本番ビルド、Playwrightの4件が成功した。開発サーバーでもPC・スマートフォン表示を確認した。他のOS・ブラウザーでの検証は後続工程で行う。

Step 2はユーザー決定によりPrismaへ変更し、実装・検証済み（2026-09-27、Node.js 24.21.0、PostgreSQL 18.4）。単体10件・実DB結合6件・ブラウザー4件、lint・型チェック・本番ビルドが成功した。非管理者ロールでのDBテスト、CLIの接続失敗時の終了コードと秘密情報非出力、SQL生成も確認した。一時PostgreSQLで検証し、本番DBや開発用の永続DBは作成していない。TLS接続と他OSの実行は未検証。

```text
packages/create-kumuno/ CLI bundled template（private）
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

旧Step番号と第3版のMilestone番号を混同しない。現在のNext.js基盤はテンプレートとして配置済み。CLI生成物の自動検証を追加した。認証の生成物検証まで完了。共通認可・管理画面・備品管理を実装済み。npm配布物の検証は未完了。

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
| 12 | CLI Integration Test | 配布tgzの生成・checkを先行自動化。生成物のDB結合テスト・CIは次工程 |
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
