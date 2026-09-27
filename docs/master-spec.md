# Oshigoto Kit v0.1

## Codex Master Specification

### 1. プロジェクト概要

プロジェクト名は **Oshigoto Kit** とする。

Oshigoto Kitは、日本の業務システムをAIコーディングエージェントと共同開発するための、オープンソースの開発基盤である。

特定のAIサービスには依存しない。

想定するAIコーディングエージェントは以下。

* OpenAI Codex
* Claude Code
* Cursor
* その他、将来登場するコーディングエージェント

Oshigoto Kitの目的は「ノーコードツールを作ること」ではない。

**業務を理解している人が、AIと一緒に、安全で一貫性のある業務システムを開発できる土台を提供すること**を目的とする。

---

# 2. プロダクトビジョン

コンセプト：

> **社内システムを、AIと作る。**

英語：

> **Build business software with your AI coding agent.**

対象ユーザーは、必ずしも専業エンジニアではない。

主な対象：

* 一人情シス
* 社内SE
* DX担当者
* 小規模SIer
* 個人開発者
* プログラミング経験のある現場職
* AIコーディングエージェントを使って業務改善したい人

完全な非エンジニアはv0.1の主要ターゲットにはしない。

---

# 3. 長期ビジョン

最終目標として **Oshigoto Kit Cloud** を想定する。

Cloud版ではユーザーが、

「社員の資格管理システムを作りたい」

などと自然言語で入力すると、

1. 要件整理
2. データモデル作成
3. UI作成
4. 権限設定
5. DB構築
6. デプロイ
7. SSL
8. バックアップ
9. アップデート
10. 運用

まで可能な限り自動化する。

ただし、**v0.1ではCloud機能を実装しない。**

OSS版を意図的に機能制限したCloud版の無料版にしてはならない。

Oshigoto Kit OSS単体で実用的な業務システムを構築できることを基本思想とする。

---

# 4. v0.1の目的

v0.1では巨大なローコードプラットフォームを作らない。

最初のゴールは、

> **AIコーディングエージェントがOshigoto Kitの規約に従って、一般的なCRUD業務システムを短時間で実装できること**

とする。

v0.1の成功条件は、サンプルとして「備品管理システム」をAIに指示し、Oshigoto Kit上で実装できること。

---

# 5. 技術スタック

原則として以下を採用する。

## Frontend / Backend

* Next.js
* App Router
* TypeScript
* React
* Server Componentsを基本とする
* Server ActionsまたはRoute Handlerを用途に応じて使用

## Database

標準DB：

**PostgreSQL**

SQLite対応は将来検討する。

v0.1ではPostgreSQLのみでよい。

## ORM / DBアクセス

ORMを導入する場合でも、Oshigoto KitがORMへ強くロックインされない設計にする。

DBスキーマとSQLの可視性を重視する。

複雑な処理で生SQLが必要な場合は許可する。

採用するDBライブラリについては、実装開始時に候補を比較し、理由を文書化してから決定すること。

## Styling

* Tailwind CSS

UIコンポーネントについては、アクセシビリティと保守性を優先する。

## Runtime

* Node.js

---

# 6. ライセンス

Oshigoto Kit本体は、企業・個人が安心して、

* 商用利用
* 改変
* 再配布
* 自社製品への組み込み

を行えるライセンスを採用する。

第一候補：

**MIT License**

Apache License 2.0も候補とする。

v0.1公開前に最終決定する。

依存ライブラリについてもライセンスを確認し、OSSとして再配布するうえで問題のある依存関係を避けること。

---

# 7. 基本設計思想

## 7.1 普通のNext.jsコードであること

Oshigoto Kit独自のDSLや特殊なランタイムへの依存を可能な限り避ける。

生成・実装されたアプリケーションは、

> **普通のNext.js + TypeScript + PostgreSQLアプリケーション**

として理解・変更できること。

Oshigoto Kitを使わなくなった場合でも、コードを継続して保守できること。

---

# 7.2 AI First

コードだけでなく、

**AIがプロジェクト構造を理解しやすいこと**

を第一級の設計要件とする。

AIが推測しなければならない設計を減らす。

以下を明文化する。

* ディレクトリ構成
* 命名規則
* DB規約
* 権限規約
* UI規約
* エラー処理
* 監査ログ
* テスト方針
* 新規機能追加手順

---

# 7.3 特定AIに依存しない

Oshigoto Kitのコード本体にCodex APIやClaude APIを組み込まない。

AIとの連携は基本的にドキュメントとプロジェクト規約によって実現する。

---

# 7.4 Self-hosted First

Oshigoto Kitで作ったシステムは、自社環境で運用可能であること。

将来的には、

* Linux
* Windows Server
* Docker
* クラウド

を対象とする。

インターネットへ接続できない閉域環境も長期的な重要ユースケースとする。

---

# 7.5 日本の業務システムをFirst-class citizenとする

海外製フレームワークへ日本対応を後付けするのではなく、

* 組織
* 部署
* 社員番号
* 承認
* 監査
* Excel
* CSV
* A4
* PDF
* 印刷
* 年度
* 日本語

などを主要ユースケースとして設計する。

ただしコードそのものを日本専用にはしない。

将来的な国際利用を妨げない設計にする。

---

# 8. v0.1 必須機能

## 8.1 Authentication

最低限以下を実装する。

* ログイン
* ログアウト
* セッション管理
* パスワードハッシュ
* 未ログインユーザーの保護
* 無効ユーザーのログイン拒否

認証処理を各画面へ散在させない。

---

# 8.2 User

ユーザーは最低限以下を持つ。

```text
id
employeeCode
name
email
passwordHash
isActive
createdAt
updatedAt
```

employeeCodeは任意設定可能とする。

---

# 8.3 Organization

v0.1では最低限、

```text
Organization
Department
User
```

を扱う。

Departmentは階層構造を表現できる設計にする。

例：

```text
株式会社ABC
│
├─ 営業部
│   ├─ 東京営業課
│   └─ 大阪営業課
│
├─ 総務部
│
└─ 開発部
```

将来的に、

* 役職
* 兼務
* 異動履歴
* 複数事業所

を追加できる設計にする。

v0.1で全て実装する必要はない。

---

# 8.4 Authorization / RBAC

最低限、

```text
Admin
Manager
User
```

のRoleを実装する。

ただしコード中で、

```text
if (role === "admin")
```

を大量に書く設計は禁止する。

権限判定を共通化する。

将来的に、

```text
自分のみ
自部署
配下部署
全社
```

というデータスコープを導入できる設計を考慮する。

---

# 8.5 Audit Log

v0.1から実装する。

最低限、

```text
userId
action
resourceType
resourceId
timestamp
metadata
```

を記録できること。

対象：

* CREATE
* UPDATE
* DELETE

可能であれば、

```text
before
after
```

も保存できる設計とする。

監査ログは通常ユーザーが改変できないこと。

---

# 8.6 CRUD Foundation

業務機能を追加するときに毎回、

* 一覧
* 詳細
* 新規
* 編集
* 削除
* Validation
* 権限確認
* 監査ログ

をゼロから実装しなくてよい構造を作る。

ただし巨大な独自CRUD DSLは作らない。

普通のTypeScriptとして読めることを優先する。

---

# 9. サンプル業務アプリ

v0.1のReference Applicationとして、

**備品管理**

を実装する。

モデル例：

```text
Equipment

id
name
category
purchaseDate
purchasePrice
departmentId
assignedUserId
status
notes
createdAt
updatedAt
```

status：

```text
IN_USE
STORAGE
REPAIR
DISPOSED
```

必要画面：

```text
備品一覧
備品詳細
備品登録
備品編集
備品削除
```

一覧では最低限、

* 検索
* ページネーション
* 並び替え

を実装する。

このReference Applicationは単なるデモではなく、

**「Oshigoto Kitで新しい業務機能を作る正しい実装例」**

として扱う。

AIは新規機能実装時に、この実装をReferenceとして参照できること。

---

# 10. UI方針

業務システムなので、装飾より、

* 視認性
* 操作速度
* 一貫性
* アクセシビリティ
* PC操作
* タブレット操作

を優先する。

基本レイアウト：

```text
┌──────────────────────────┐
│ Header                   │
├─────────┬────────────────┤
│         │                │
│ Sidebar │ Main Content   │
│         │                │
│         │                │
└─────────┴────────────────┘
```

スマートフォンでも最低限利用可能にする。

ただしv0.1はPCを主要ターゲットとする。

---

# 11. エラー処理

ユーザー向けエラーと内部エラーを分離する。

DBエラーをそのまま画面に表示しない。

例：

悪い例：

```text
duplicate key value violates unique constraint...
```

良い例：

```text
この社員番号はすでに登録されています。
```

サーバー側にはデバッグ可能な情報を残す。

---

# 12. Validation

クライアント側だけに依存しない。

サーバー側で必ずValidationを実施する。

Validation Schemaを可能な限り共通化する。

---

# 13. Security

最低限以下を遵守する。

* パスワードを平文保存しない
* SQL Injection対策
* XSS対策
* CSRFを考慮
* 認証・認可をサーバー側で実施
* クライアントから渡されたuserIdやroleを信用しない
* 秘密情報をGitへcommitしない
* `.env.example`を提供する
* セキュリティ関連処理を共通化する

---

# 14. Database

Migrationを必須とする。

本番DBを手動変更することを前提にしない。

最低限、

```text
organizations
departments
users
roles
user_roles
audit_logs
equipment
```

相当の構造を持つ。

外部キーを適切に設定する。

削除時の挙動を明示する。

---

# 15. Seed

開発環境用Seedを用意する。

例：

```text
Organization:
Oshigoto Demo Company

Admin:
admin@example.com

Departments:
総務部
営業部
開発部
```

初期パスワードの扱いについては安全な方法を採用し、READMEへ記載する。

---

# 16. Testing

v0.1から最低限の自動テストを導入する。

特に、

* Authentication
* Authorization
* Validation
* Audit Log

は優先してテストする。

UIの細かな見た目より、業務ロジックのテストを優先する。

---

# 17. Documentation

以下を作成する。

```text
README.md
AGENTS.md
CLAUDE.md

docs/
├── architecture.md
├── getting-started.md
├── database.md
├── authentication.md
├── authorization.md
├── organization.md
├── audit-log.md
├── adding-a-feature.md
├── coding-conventions.md
└── deployment.md
```

AGENTS.mdはCodex専用命令にしすぎず、他のAIエージェントでも理解できる一般的なプロジェクト規約を中心にする。

CLAUDE.mdもAGENTS.mdと矛盾させない。

**Single Source of Truthはdocs側とする。**

AI固有ファイルに重要な仕様を重複して大量記載しない。

---

# 18. README

READMEの冒頭で、

「何の技術を使っているか」

より先に、

**何が解決できるのか**

を書く。

例：

# Oshigoto Kit

> 社内システムを、AIと作る。

Oshigoto Kit is an open-source foundation for building business applications with AI coding agents.

その後、

```text
✓ Authentication
✓ Organization
✓ RBAC
✓ Audit logs
✓ PostgreSQL
✓ Business UI
✓ Self-hosted
✓ AI-agent friendly
```

などを示す。

---

# 19. ディレクトリ構成

実装開始時にCodexが提案する。

ただし、

* domain
* database
* authentication
* authorization
* audit
* UI
* business features

の責務を分離すること。

巨大な、

```text
utils.ts
helpers.ts
actions.ts
```

に何でも入れる設計は禁止。

Feature単位でコードの所在が理解できること。

---

# 20. v0.1で実装しないもの

以下は重要。

Codexは先回りして実装してはならない。

* Oshigoto Kit Cloud
* AI API統合
* ノーコードビルダー
* ドラッグ&ドロップ画面作成
* 汎用フォームビルダー
* 汎用ワークフローエンジン
* 電子印鑑
* PDF帳票エンジン
* Excelテンプレート
* メール通知
* Slack通知
* Teams通知
* LDAP
* Active Directory
* SSO
* 多言語UI
* SQLite
* マルチテナントSaaS
* 課金
* モバイルアプリ

これらは将来ロードマップとして扱う。

---

# 21. 将来予定

## v0.2候補

* CSV import/export
* Excel export
* ファイル添付
* Audit Log Viewer
* 高度な検索

## v0.3候補

Approval Workflow

```text
申請
↓
承認
↓
差戻し
↓
却下
↓
取下げ
```

多段階承認。

## v0.4候補

* A4帳票
* PDF
* 印刷
* ヘッダー/フッター
* 改ページ

## v0.5候補

* Docker
* Backup / Restore
* Windows Server運用
* 閉域環境

## v1.0

安定API。

実運用可能なOSS業務システム基盤。

---

# 22. Codexの開発ルール

Codexは以下を必ず守ること。

### Rule 1

一度に大量実装しない。

小さな単位で、

```text
設計
↓
実装
↓
テスト
↓
確認
↓
commit可能な状態
```

まで完成させる。

### Rule 2

仕様に不明点がある場合、勝手に大きな設計判断をしない。

選択肢とトレードオフを提示する。

### Rule 3

新しい依存パッケージを追加するときは、

* なぜ必要か
* 標準機能では不十分か
* メンテナンス状況
* ライセンス
* 代替案

を確認する。

### Rule 4

不要な抽象化をしない。

「将来使うかもしれない」だけの抽象レイヤーを作らない。

### Rule 5

セキュリティに関係するコードでは、簡潔さより安全性を優先する。

### Rule 6

業務ロジックをReact Componentへ直接埋め込まない。

### Rule 7

実装変更に伴って仕様が変わった場合、関連するdocsも更新する。

### Rule 8

lint / typecheck / testを通してから完了とする。

---

# 23. 最初の実装順序

Codexは以下の順序で進める。

## Step 1

リポジトリ初期化。

Next.js + TypeScript。

最低限のREADME作成。

まだ業務機能は作らない。

## Step 2

PostgreSQL接続。

Migration環境構築。

## Step 3

User / Organization / Department。

## Step 4

Authentication。

## Step 5

Authorization / RBAC。

## Step 6

基本レイアウト。

Header / Sidebar。

## Step 7

Audit Log。

## Step 8

Reference ApplicationとしてEquipment Managementを実装。

## Step 9

Testing。

## Step 10

AI向けドキュメントを完成。

その後v0.1として評価する。

---

# 24. v0.1 Acceptance Criteria

以下を満たしたらv0.1候補とする。

新規環境でREADMEだけを読んでセットアップできる。

ログインできる。

ユーザーを管理できる。

部署を管理できる。

Roleによってアクセス制御される。

備品を、

```text
登録
閲覧
編集
削除
検索
```

できる。

変更操作がAudit Logへ残る。

PostgreSQL Migrationで環境を再構築できる。

主要業務ロジックにテストがある。

CodexまたはClaude Codeに、

> 「社員研修管理機能を追加してください」

と依頼した際、

**既存Reference Applicationとdocsを参照して、Oshigoto Kitの設計規約に沿った機能を追加できる。**

これをv0.1における最重要Acceptance Testとする。

---

# 25. 最重要原則

Oshigoto Kitは、

**「機能が多いOSS」**

を目指さない。

目指すものは、

> **業務を知っている人とAIが、一緒に良い業務システムを作るための土台**

である。

AIがコードを書く時代だからこそ、

* Authentication
* Authorization
* Organization
* Audit
* Database
* Validation
* Security
* Business conventions

という「毎回AIにゼロから考えさせるべきではない部分」をOshigoto Kitが担う。

ユーザー固有の業務ロジックは、人間とAIが自由に実装する。

---

# 26. Codexへの最初の指示

この仕様書をプロジェクトの最上位仕様として扱ってください。

ただし、直ちに全機能を実装してはいけません。

最初に以下だけを実施してください。

1. この仕様を読み、目的と制約を理解する。
2. v0.1に必要な技術選定を整理する。
3. 特にDBアクセス層、Authentication、Validation、Testingについて候補を提示する。
4. 推奨ディレクトリ構成を提示する。
5. 想定される技術的リスクを提示する。
6. v0.1を小さな実装マイルストーンに分解する。
7. この時点ではコードを変更しない。

回答を私に提示し、承認を得てからStep 1の実装を開始してください。

勝手にスコープを拡大しないでください。

**Oshigoto Kit v0.1では、「小さく、理解可能で、安全な土台を完成させること」を最優先してください。**
