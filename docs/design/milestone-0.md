# Milestone 0：第3版に基づく技術設計案

2026-09-27。状態：比較・推奨を提示済みの設計案。PrismaとBetter Authの標準構成・Accountへのハッシュ保存はユーザー決定済み。その他の推奨は設計案として区別する。リポジトリ構成はMilestone 1への進行承認に基づき実装済み（[選定記録](../decisions/0004-repository-layout.md)）。新規依存追加・公開は未実施。

## 1. 作るもの

KUMUNOは、CLIで普通のNext.js業務アプリを生成するOSS。認証・共有マスタ・認可・監査と備品管理の実装例を提供し、利用者が生成コードを所有してAIと拡張する。CLIの成功だけでなく、生成物のセットアップ・ビルド・業務操作・AIによる追加開発までが成果物となる。

## 2. Repository Architecture

| 候補 | 利点 | 負担 | 判断 |
| --- | --- | --- | --- |
| npm workspacesによる小さなmonorepo | CLIとテンプレートを同じ変更・検証で扱える | rootと生成アプリの依存・lockの区別が必要 | 推奨 |
| アプリ中心の単純な単一package | 現在の構成を維持できる | 公開CLIとアプリの配布対象が混ざりやすい | CLI必須となったため移行する |
| 別リポジトリ | リリースを独立管理できる | templateとCLIの版ずれ・同期・CIが複雑 | v0.1では不採用を推奨 |

提案する構成：

```text
packages/create-kumuno/  CLI package（workspace）
templates/default/            独立したNext.jsアプリ（workspaceに含めない）
docs/                         製品仕様・設計判断
scripts/                      配布用template組み立て・検証
tests/                        CLI・配布物の結合テスト
```

rootはprivate、CLI packageだけ公開可能にする。テンプレートは独自package-lock.jsonを持ち、生成直後にnpm ciで再現できる。rootのworkspacesはCLIだけに限定し、生成アプリにworkspace参照やrootへの相対依存を残さない。Turborepo / Nxは追加しない。

現アプリのsrc・prisma・設定・アプリテストをtemplates/defaultへ移す。旧Step 1・2の成果は再利用し、rootのnpm run checkからCLIとテンプレートの検証を呼ぶ。製品のmaster-specと利用者向けdocsは分ける。テンプレートのAGENTS.md / CLAUDE.mdは、同梱する利用者向けdocsへの入口とし、製品開発のMilestone指示を生成アプリへ持ち込まない。

## 3. Shared Core・ID・連携境界

[Domain境界](../domain-boundaries.md)と[連携方針](../integration.md)を適用する。User / Organization / Departmentを共有し、Trainingなどの属性はDomain側でUser.idへ関連付ける。Shared Coreから個別Domainへの依存は持たせない。

| ID案 | 利点 | 負担 |
| --- | --- | --- |
| UUID v4 | Node標準で生成可能、DB外でも採番可能 | ランダムな索引挿入、連番より大きい |
| UUID v7 | 時系列で索引に配置しやすい | 生成場所・対応API・時刻情報の扱いを統一する必要 |
| ULID | 文字列表現で時系列順に扱える | PostgreSQL UUID型と異なる、追加実装の選定が必要 |
| DB連番 | 単純で小さい | 別システムのデータ統合時にID衝突の扱いが必要 |

v0.1はUUID v4を推奨。PostgreSQLのuuid型、Nodeのcrypto.randomUUIDを基本とし、認証ライブラリの生成方式も合わせて検証する。社員番号は変更可能な業務キーであり主キーにしない。IDの推測困難性で認可を代替しない。

serviceは認可済みのactorを明示的に受け取り、入力検証・業務ルール・repository・監査の境界を明確にする。変更操作と監査は同じDBトランザクションで整合性を保つ。UIや将来のRoute Handlerは同じ業務入口を呼び出す。抽象的なEvent Busや汎用Repositoryは作らない。

## 4. DB技術（Prismaは決定済み）

| 候補 | 適性 | 今回の扱い |
| --- | --- | --- |
| Prisma | 宣言的モデル、生成Client、SQL Migration、生SQL | ユーザー決定を維持。7.10.0を実装・検証済み |
| Drizzle | TypeScript定義、SQLに近いクエリ | 比較済み、置換済み |
| Kysely | 型付きSQL query builder、複雑なSQLを表現しやすい | スキーマ型・Migration運用の整理が別途必要。追加しない |
| node-postgres | SQLを直接扱える | PrismaPgのdriverとして維持。業務の第二ORMにはしない |

Viewは必要になった工程でSQL Migrationと型付きの読み取りを検討する。未検証のPrisma preview機能を前提にしない。通常のCRUDはPrisma、必要な集計はパラメーター化SQLとし、SQLの可視性を維持する。

## 5. Authentication（ユーザー承認済み）

| 候補 | 利点 | 負担 |
| --- | --- | --- |
| Better Auth | メール/パスワード・セッション・Prisma adapter。自社DBで利用可能 | 標準はAccountにpasswordを保存し、旧User.passwordHash必須仕様と相違したため、承認により仕様を更新 |
| Auth.js Credentials | 任意の資格情報検証と組み合わせられる | ハッシュ処理・ユーザー管理などを自前で補う必要 |
| 独自のDBセッション認証 | User.passwordHashをそのまま維持できる | セッション失効・CSRF・試行制限などの実装と保守を自分たちが負う |

採用はBetter Authの標準スキーマ。Userは業務上の人物、Accountは認証資格情報として分離する。ハッシュをUserとAccountの両方へ保存しない。ユーザーの明示的承認により第17章をAccountのハッシュ保存へ変更した。依存導入は未実施。

採用する場合、公開サインアップは無効にし、管理者によるユーザー作成を基本とする。無効ユーザーはログイン時だけでなく保護された操作でも拒否し、既存セッションを失効させる。Roleと業務OrganizationはKUMUNO側が所有し、同名の認証pluginで二重管理しない。パスワードハッシュ・セッションtokenは業務DTOや監査差分に含めない。メール送信・SSOは追加しない。

2026-09-27のnpm確認ではBetter Auth 1.7.6、MIT。Prisma adapterの公式例はPrisma 7対応。実装時に版を固定し、必要な追加adapter package・Node互換性・脆弱性を改めて確認する。導入済みとは扱わない。

## 6. Validation

| 候補 | 利点 | 負担 |
| --- | --- | --- |
| Zod | TypeScript型推論、safeParseによる実行時検証 | clientに送るschemaの範囲を管理する |
| Valibot | 小さな関数の組合せで必要部分を利用できる | チームでAPIの書き方を統一する必要 |
| 手動検証 | 追加依存なし | 入力ごとの型・エラー対応が重複する |

Zodを推奨。業務入力のサーバー検証を正本とし、機密情報を含まないschemaのみ必要に応じてUIと共有する。DBモデルから入力schemaを無条件に生成せず、ユーザーが変更可能なフィールドを明示する。npm確認時は4.6.5、MIT。標準TypeScriptだけでは実行時検証できないため導入理由がある。今は未導入。

## 7. TestingとCI

既存Vitest / Playwrightを継続。単体はValidation・認可・業務ルール。実PostgreSQLでは制約・Migration・失効・監査のトランザクションを検証する。E2Eはログイン、無効ユーザー、Role別操作、備品CRUD、監査記録を段階追加する。

CLIは名前不正・非空出力先・symlink・依存導入失敗・非対話モードをテストする。配布物はnpm packで作った実tgzから実行し、一時ディレクトリへ生成する。生成物でnpm ci、lint、typecheck、test、build、専用PostgreSQLでMigration / Seedを検証する。checkoutだけで通る相対参照を検出する。

CIは同じ手順をGitHub Actionsで実行し、DBはサービスコンテナを利用する案。利用者のローカル環境にDockerを必須化しない。まずLinux、CLIのパス処理はWindows/macOSも追加検証する。A〜Eの生成体験・AI拡張に加え、F/GはDomain設計レビューとして記録する。

## 8. CLI方式

| 方式 | 利点 | 負担 | 判断 |
| --- | --- | --- | --- |
| npm同梱Template Copy | 版が固定され、Git取得不要 | npm配布物サイズと同梱漏れの検証が必要 | 推奨 |
| 全面的Code Generation | 細かな選択に対応可能 | 二重のロジック・独自DSLが増える | 不採用 |
| Git Template取得 | テンプレート更新を分離できる | Git・通信・取得refの扱いが必要 | 不採用 |
| ランタイムpackageへ依存 | 共通部分の更新を集中できる | Code Ownershipを弱める | 不採用 |

CLIはNode標準のfs/path/readline/utilとTypeScriptで始める。対話質問は名前・依存インストールのみ。非対話用の--yes / --no-installを用意する案。shell文字列へ入力を埋め込まず、npmは引数配列で起動する。CLI実装はMilestone 11、Milestone 1はpackage境界の準備だけ。

出力は存在しないディレクトリを原則とする。既存ファイルを上書きせず、失敗しても利用者の既存ディレクトリを削除しない。ファイルコピー対象は配布用manifestで制限し、.env・node_modules・.git・生成物を同梱しない。package名等の置換だけを明示的に行う。

## 9. 配布・セットアップ

CLI packageはbinでcreate-kumunoを公開し、filesでdist・template・LICENSE等を限定する。prepackでtemplateを組み立て、npm packの内容と実行可能性を検証する。rootはprivateのまま。ライセンスは未確定なのでnpm公開前に決定する。改名後のcreate-kumunoについて、公開前にnpm Registryで名前の利用可否と公開権限を確認する。npm公開・所有者認証はMilestone 14で別途実行する。

生成アプリの環境設定は、現行の.env.localへ統一する案。CLI出力と仕様の例も導入時に揃える。CLIはDBを勝手に作らず、DB作成→.env.local設定→db:migrate→db:seed→devを案内する。shadow DBはMigration作成用に別途準備する。初期管理者パスワードは対話入力または秘密の環境変数から受け取り、固定値・ログ出力・自動Git commitを避ける。Seedの本番誤実行防止と再実行時の扱いを実装する。

## 10. セキュリティ上の確認事項

| リスク | 対応する工程と方針 |
| --- | --- |
| CLIのパス越境・既存ファイル破壊 | M11: 名前と出力先検証、symlink拒否、既存先へ書き込まない |
| 配布物への秘密の混入 | M12/14: allowlist・tgz内容検査、環境ファイルの除外 |
| セッション・パスワード漏えい | M5: cookie属性・HTTPS・ログ除外・失効・CSRF・試行制限 |
| 認可漏れ・無効化後のアクセス | M5/6: サーバー側の各操作でユーザー状態と権限を確認 |
| SQL Injection・不正入力 | M4以降: パラメーター化と許可フィールドの検証 |
| 監査漏れ・監査改変 | M7: 更新と同一トランザクション、通常操作から変更不可 |
| Migration / Seedによるデータ破壊 | M3/4: DB分離、復旧手順、固定初期パスワード禁止 |
| サプライチェーン | 各工程とM14: 版固定・lock・audit・ライセンス・配布物検証 |

## 11. 小さな実装単位

1. M1: root / CLI / templateの配置と検証コマンドを整理し、既存アプリの回帰テストを通す。
2. M2/3: template単独インストール・Client生成・DB接続・Migrationを確認する。
3. M4: 確定したAccount保存を前提に、共有マスタ・ID・外部キー・開発Seedを実装する。
4. M5: 認証、失効、無効ユーザー、異常系を完成させる。
5. M6/7: 認可を共通化し、監査を変更操作へ組み込む。
6. M8/9: 管理UIを小分けに作り、備品管理の一覧系、次に変更系を実装する。
7. M10: 実装に基づき利用者向けdocs・AI入口を完成させる。
8. M11/12: CLI、次にtgzからの生成とCIを完成させる。
9. M13/14/15: 公開文書・ライセンス・npm公開準備、公開、A〜Gの受け入れ評価。

各単位で設計→実装→テスト→docsを完了する。Trainingを標準機能として先回り実装しない。

## 公式資料

- [Better Auth DB schema](https://better-auth.com/docs/concepts/database)
- [Better Auth Prisma adapter](https://better-auth.com/docs/adapters/prisma)
- [Auth.js Credentials](https://authjs.dev/getting-started/providers/credentials)
- [Node.js 24 crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html)
- [PostgreSQL 18 UUID](https://www.postgresql.org/docs/18/datatype-uuid.html)
- [ULID specification](https://github.com/ulid/spec)
- [Zod](https://zod.dev/basics)
- [Valibot](https://valibot.dev/guides/introduction/)
- [Kysely](https://kysely.dev/)
- [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)
- [npm pack](https://docs.npmjs.com/cli/v11/commands/npm-pack/)
