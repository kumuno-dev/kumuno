# KUMUNO v0.1
## Codex Master Specification v3.1

**Status:** Master Specification\
**Target:** v0.1\
**Project:** KUMUNO\
**Primary Interface:** `npx create-kumuno`\
**Last Updated:** 2026-09-28\
**Supersedes:** Codex Master Specification v3

追加の承認済み方針（2026-10-01）：共通機能をnpmパッケージとして順に抽出し、既存アプリへの追加とCLIからの新規生成を両立する。[組合せ型構成と追加順](package-architecture.md)を参照。v0.1の既存受入条件は維持する。

---

# 1. プロジェクト概要

KUMUNOは、

> **AIコーディングエージェントと一緒に業務システムを作るためのOSS開発基盤**

である。

ユーザーは以下のコマンドから開発を開始する。

```bash
npx create-kumuno my-business-app
```

生成されたプロジェクトには、一般的な業務システムで繰り返し必要になる、

- Authentication
- User Management
- Organization
- Department
- RBAC
- Audit Log
- Validation
- Database
- Business UI
- AI向け開発規約

などが最初から用意される。

その後ユーザーは、

- OpenAI Codex
- Claude Code
- Cursor
- その他のAIコーディングエージェント

を使って、自分固有の業務機能を追加する。

---

# 2. 最重要コンセプト

日本語：

> **AIで小さく作る。でも、将来つながる。**

英語：

> **Build business software with your AI coding agent.**

技術的には、

> **AI時代の業務システム向け `create-next-app`**

という位置付けを目指す。

---

## 2.1 「組む」という思想

KUMUNOのブランドは「組む」を中心に据える。

- 人とAIで組む：業務を知る人が目的を示し、AI coding agentとコードを作り、理解・検証・所有する。
- 必要な機能を組む：認証・組織・権限などの共通基盤に、必要な業務だけを小さく追加する。
- 将来つながる：共有IDとDomain境界を保ち、別の部署・業務との連携を後から追加できる。

「つながる」は自動連携や分散システムの提供を意味しない。v0.1ではShared Coreを共有する普通のNext.jsアプリを作る。巨大な独自DSL、汎用Pluginランタイム、業務マスタの複製は導入しない。利用者は生成コードを所有し、KUMUNOから独立して運用・変更できる。

## 2.2 正式名称と公開表現

| 対象 | 名称 |
| --- | --- |
| ブランド | KUMUNO |
| 公式サイト | https://kumuno.jp |
| 本体 | kumuno-dev/kumuno |
| LP | kumuno-dev/kumuno-site |
| CLI package / bin | create-kumuno |
| 開始コマンド | npx create-kumuno my-app |

説明文は「AI coding agentsのための、オープンソース業務システム開発基盤。」とする。アクセントカラーはオレンジ。マスコットはオレンジと生成りの雲形の仮案を使用し、名称・最終デザインは未確定とする。マスコットやLPの公開を製品の完成・npm公開とは扱わない。

この文書のCLI実行例・完成機能はv0.1の目標仕様であり、現在の利用可能範囲はarchitecture.mdとREADMEに記載する。npm公開前はLP・READMEで公開準備中と明示する。LPはCloudflare Pagesへ配置するが、生成アプリのホスティング先をCloudflareに限定しない。

# 3. KUMUNOが解決する問題

AIコーディングエージェントを使えば、CRUDアプリそのものは簡単に作れるようになった。

しかし業務システムでは、毎回AIに、

- 認証
- 認可
- Role
- 組織
- 部署
- Validation
- Audit Log
- Database設計
- Security
- Error Handling
- UI規約

をゼロから設計させるべきではない。

プロジェクトごとに設計がバラバラになる危険もある。

KUMUNOは、

> **業務システムの共通部分を、AIに毎回再発明させない**

ための基盤である。

---

# 4. 対象ユーザー

v0.1の主要ユーザーは、

- 一人情シス
- 社内SE
- DX担当者
- 小規模SIer
- 個人開発者
- AIコーディングを利用する現場担当者
- プログラミング経験のある非専業エンジニア

とする。

完全な非エンジニアはv0.1の主要ターゲットにはしない。

---

# 5. 長期ビジョン

最終目標として、

# KUMUNO Cloud

を想定する。

Cloud版では最終的に、

```text
何を作りたいですか？

> 社員の資格管理システムを作りたい
```

のような自然言語入力から、

```text
要件整理
↓
データモデル
↓
UI
↓
権限
↓
アプリ生成
↓
DB
↓
デプロイ
↓
SSL
↓
Backup
↓
Update
↓
運用
```

まで支援する。

ただし、

**KUMUNO Cloudはv0.1では実装しない。**

OSS版はCloud版の機能制限版にしてはならない。

OSS単体でも実用的な業務システムを構築できることを原則とする。

---

# 6. v0.1の中心体験

v0.1における最重要UXは以下。

```bash
npx create-kumuno my-company-app
```

CLIがプロジェクトを生成する。

```text
Creating my-company-app...

✓ Next.js
✓ TypeScript
✓ PostgreSQL
✓ Authentication
✓ User Management
✓ Organization
✓ Department
✓ RBAC
✓ Audit Log
✓ Validation
✓ Business UI
✓ AI Agent Instructions

KUMUNO is ready.
```

ユーザーは、

```bash
cd my-company-app
npm run dev
```

を実行する。

ブラウザからログインできる。

その後、CodexまたはClaude Codeに例えば、

```text
社員資格管理機能を追加してください。

社員ごとに、

・資格名
・取得日
・有効期限
・証明書
・備考

を管理したいです。
```

と指示する。

AIはKUMUNOの既存コード・Reference Application・ドキュメントを理解し、

**KUMUNOの規約に従って新しい業務機能を実装する。**

これがv0.1の中心体験である。

---

# 7. 最重要設計原則

## 7.1 Code Ownership

生成後のコードはユーザーのものである。

KUMUNO独自ランタイムへの強い依存を避ける。

生成されたアプリケーションは、

> **普通のNext.js + TypeScript + PostgreSQLアプリケーション**

として理解・変更・運用できること。

ユーザーが将来KUMUNOを使用しなくなっても、アプリケーションを維持できること。

---

# 7.2 AI Agnostic

特定AIベンダーに依存しない。

以下すべてを想定する。

```text
Codex
Claude Code
Cursor
Future AI Coding Agents
```

KUMUNO本体にOpenAI APIやAnthropic APIを必須依存として組み込まない。

---

# 7.3 AI-readable

AIがコードベースを理解しやすいことを第一級要件とする。

人間だけでなくAIにとっても、

```text
どこに何があるか
どう実装するか
何をしてはいけないか
```

が明確であること。

---

# 7.4 No Lock-in

独自DSLを可能な限り作らない。

例えば、

```text
kumuno.defineBusinessApp(...)
```

のような巨大な独自抽象化ですべてを隠蔽しない。

TypeScript / React / SQLなど一般的な技術知識で理解できること。

---

# 7.5 Self-hosted First

生成されたシステムは自社環境で運用可能であること。

長期的には、

- Linux
- Windows Server
- Docker
- Cloud
- LAN-only environment

を対象とする。

インターネット接続なしでも本番アプリが動作できる構成を長期的に重視する。

---

# 7.6 Integration-ready by Default

KUMUNOで作られる業務システムは、最初は単一部署・単一業務で利用されても、将来ほかの部署・業務システムと連携できる構造を持つこと。

ただし、v0.1から分散システム、マイクロサービス、メッセージブローカー等を導入してはならない。

目的は、

> **今は小さく作り、後から安全につなげられること**

である。

各Feature / Domainは責務を明確にし、他Featureの内部実装へ無制限に依存しない。

将来、例えば以下の連携が自然に追加できることを想定する。

```text
人事 / 職員マスタ
      ↓
資格管理
      ↓
研修管理
      ↓
勤務・申請
      ↓
備品管理
```

同じ人物・部署・組織を各業務機能が独自定義しない。

---

# 7.7 Shared Core and Business Domains

アプリケーションを概念的に、

```text
Shared Core
├── Identity / Authentication
├── User
├── Organization
├── Department
├── Authorization
└── Audit

Business Domains
├── Equipment
├── Training
├── Qualification
├── Purchase Request
└── Future Features
```

へ分ける。

Business Domainは、User / Organization / Department等の共通概念を再実装しない。

一方、Shared Coreへ個別業務固有のルールを混入させない。

---

# 7.8 Stable Identity

将来の部署間連携を可能にするため、主要Entityは表示名や社員番号だけを結合キーとして使用しない。

内部では安定したIDを使用する。

例：

```text
User.id
Organization.id
Department.id
Equipment.id
```

`employeeCode`、部署コード等は業務上重要であっても変更される可能性があるため、原則として内部Primary Keyとは分離する。

ID方式（UUID / ULID / database-generated ID等）はMilestone 0で比較し、Codexが推奨を提示する。

---

# 7.9 Integration Contract

Feature間の連携では、他FeatureのDBテーブル構造を前提にした無制限な直接参照を避ける。

同一アプリ内の単純なForeign Keyは許可する。

ただし、将来外部システムとの連携境界になり得る処理については、

- Service function
- Repository / data-access boundary
- Route Handler / API
- Event

など、責務が分かる境界を設けられる構造にする。

v0.1で汎用Integration Frameworkを作ってはならない。

---

# 7.10 API-ready, not API-first Everywhere

将来、他部署システム・外部サービス・KUMUNO Cloudから利用できるAPIを追加可能にする。

ただしv0.1ですべてのCRUDを公開API化しない。

APIを追加する場合は、

- Authentication
- Authorization
- Validation
- Versioning strategy
- Error format
- Audit

を考慮する。

UI専用処理と将来再利用可能なBusiness Logicを不必要に密結合させない。

---

# 7.11 Import / Export Portability

データをKUMUNO内へ閉じ込めない。

将来的にCSV / Excel / JSON / API等でImport / Exportできる設計を妨げないこと。

初期v0.1の受入範囲にはCSV / Excel機能自体を含めない。追加の承認済み方針による組合せ型構成の第6段階（2026-10-03）では、@kumuno/csvの形式検証と医療台帳のCSV出力を実装する。医療台帳の確認付き新規一括登録を追加、xlsxは後続とし、既存のAcceptance Test条件は変更しない。[現在の範囲](package-architecture.md)を参照。

---

# 7.12 Department Collaboration Principle

部署ごとに別々の業務機能が追加されても、

```text
総務だけのユーザーマスタ
放射線科だけのユーザーマスタ
経理だけのユーザーマスタ
```

のように共通概念を複製しない。

原則としてOrganization / Department / Userを共有Coreとして利用する。

ただし各部署固有の追加属性をShared Coreへ無制限に追加しない。

部署固有情報は、そのBusiness Domain側で拡張する。

---

# 8. 技術スタック

v0.1では以下を基本とする。

## Application

- Next.js
- App Router
- React
- TypeScript
- Node.js

## UI

- Tailwind CSS

UIライブラリを追加する場合、

- accessibility
- maintenance
- license
- AIによる変更容易性

を確認する。

## Database

**PostgreSQL**

を標準DBとする。

SQLiteはv0.1対象外。

---

# 9. Database Access

DBアクセス技術については、実装開始前に比較する。

候補例：

- Drizzle ORM
- Prisma
- Kysely
- node-postgres
- その他

判断基準：

1. PostgreSQLとの相性
2. Migration
3. TypeScript
4. 生SQL利用可能性
5. View対応
6. AIが理解しやすいか
7. Lock-inの強さ
8. Maintenance
9. License

Codexは勝手に決定せず、比較結果を提示すること。

---

# 10. CLI Architecture

v0.1から、

# create-kumuno

を正式なプロダクト構成要素とする。

npm Registryへ公開可能な独立CLIパッケージとして設計する。

想定：

```bash
npx create-kumuno
```

または、

```bash
npx create-kumuno my-app
```

---

# 11. CLIの責務

CLIは最低限、

1. プロジェクト名取得
2. 出力先確認
3. KUMUNOテンプレート生成
4. 必要ファイル生成
5. `.env.example`生成
6. AI instruction files生成
7. セットアップ方法表示

を行う。

---

# 12. v0.1 CLI UX

例：

```text
$ npx create-kumuno

Welcome to KUMUNO

? Project name:
> my-business-app

? Install dependencies?
> Yes

Creating KUMUNO app...

✓ Project files
✓ Authentication
✓ PostgreSQL configuration
✓ Organization
✓ RBAC
✓ Audit Log
✓ AI instructions

Done!

Next steps:

cd my-business-app

cp .env.example .env

npm run db:migrate
npm run db:seed
npm run dev
```

CLIの質問項目を増やしすぎない。

v0.1では、

```text
Database選択
Authentication選択
UI framework選択
```

など大量の選択肢を提供しない。

**Opinionated defaultsを優先する。**

---

# 13. npm公開

CLIは将来的ではなく、

**v0.1公開条件の一つ**

とする。

目標：

```bash
npx create-kumuno
```

がnpm Registryから実行できること。

npm公開前にパッケージ名の利用可能性を確認する。

---

# 14. Repository Strategy

初期段階ではmonorepoを候補とする。

例：

```text
kumuno/
│
├─ packages/
│   └─ create-kumuno/
│
├─ templates/
│   └─ default/
│
├─ docs/
│
├─ examples/
│
└─ README.md
```

ただし、monorepoがv0.1に不要な複雑性を持ち込む場合は採用しない。

Codexは実装前に、

- monorepo
- separate repositories
- simple single repository

を比較して提案すること。

---

# 15. Template Application

`create-kumuno` が生成するテンプレートには以下を含める。

## Core

- Next.js
- TypeScript
- PostgreSQL
- Authentication
- User
- Organization
- Department
- RBAC
- Audit Log
- Validation
- Error Handling

---

# 16. Authentication

最低限：

- Login
- Logout
- Session
- Password Hashing
- Protected Routes
- Disabled User Protection

パスワード平文保存は禁止。

認証ロジックを各ページに散在させない。

認証にはBetter Authの標準構成とPrisma adapterを採用する（ユーザー承認済み）。パスワードハッシュはAccountのpasswordフィールドに保存し、Userには重複保存しない。Session等の認証用モデルは採用版の標準スキーマに従う。詳細は[認証設計](authentication.md)と[選定記録](decisions/0003-authentication.md)を参照する。

---

# 17. User

最低限：

```text
id
employeeCode
name
email
isActive
createdAt
updatedAt
```

Userは業務上の人物情報を扱い、認証資格情報は関連するAccountで管理する。旧仕様のUser.passwordHash必須条件は、上記のAccountへのハッシュ保存に置き換える。Better Authの標準Userフィールドは必要に応じて追加する。

---

# 18. Organization

最低限：

```text
Organization
Department
User
```

Departmentは階層構造を扱える設計にする。

例：

```text
Company
│
├── Sales
│   ├── Tokyo
│   └── Osaka
│
├── Administration
│
└── Development
```

将来的に、

- Position
- Multiple Offices
- Concurrent Assignment
- Transfer History

を追加可能な設計とする。

---

# 19. Authorization / RBAC

v0.1：

```text
Admin
Manager
User
```

最低限この3 Roleを提供する。

以下のような実装を大量に作ってはならない。

```typescript
if (user.role === "admin") {
```

権限判定を共通化する。

将来的に、

```text
OWN
DEPARTMENT
SUBTREE
ORGANIZATION
```

というデータスコープを追加できる設計にする。

---

# 20. Audit Log

v0.1から必須。

最低限：

```text
id
userId
action
resourceType
resourceId
timestamp
metadata
```

action：

```text
CREATE
UPDATE
DELETE
```

可能なら、

```text
before
after
```

を保存可能な設計にする。

Audit Logは通常ユーザーから変更できない。

---

# 21. Validation

サーバー側Validation必須。

クライアント側Validationだけに依存しない。

Schemaは可能な限り再利用する。

Validation libraryは技術選定時に比較する。

---

# 22. Security

最低限：

- Password Hash
- SQL Injection対策
- XSS対策
- CSRF考慮
- Server-side Authorization
- Secure Session
- Secret management
- `.env`
- `.env.example`
- Sensitive informationをGitへcommitしない

クライアントから渡された、

```text
userId
role
departmentId
```

などを無条件に信用しない。

---

# 23. Business UI

業務システムなので、

- 視認性
- 一貫性
- 操作速度
- Keyboard操作
- Accessibility
- PC
- Tablet

を優先する。

装飾を目的に複雑なUIを作らない。

基本：

```text
┌───────────────────────────┐
│ Header                    │
├──────────┬────────────────┤
│ Sidebar  │ Main Content   │
│          │                │
│          │                │
└──────────┴────────────────┘
```

---

# 24. Reference Application

テンプレートには、

# Equipment Management

をReference Applicationとして含める。

目的はデモではない。

> **AIが「KUMUNOでは業務機能をこう作る」と理解するための正解例**

とする。

モデル：

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

---

# 25. Reference Application必須機能

- List
- Detail
- Create
- Edit
- Delete
- Search
- Pagination
- Sort
- Validation
- Authorization
- Audit Log

この実装を、新規業務機能のReferenceとする。

---

# 26. AI Instructions

生成された各プロジェクトに最低限、

```text
AGENTS.md
CLAUDE.md
```

を配置する。

ただし仕様のSingle Source of Truthにはしない。

詳細は、

```text
docs/
```

に置く。

AI固有ファイルは、

> 「まずdocsを読め」

という入口として機能させる。

---

# 27. Generated Project Documentation

生成されたプロジェクトに以下を含める。

```text
README.md

docs/
├── architecture.md
├── database.md
├── authentication.md
├── authorization.md
├── organization.md
├── integration.md
├── domain-boundaries.md
├── audit-log.md
├── adding-a-feature.md
├── coding-conventions.md
└── deployment.md
```

---

# 28. adding-a-feature.md

非常に重要。

AIに新規業務機能を追加させる標準手順を記載する。

例：

```text
1. Domain model
2. Migration
3. Validation
4. Authorization
5. Data access
6. Business logic
7. UI
8. Audit
9. Tests
10. Documentation
```

AIは原則この順序に従う。

---

# 29. Coding Conventions

以下を禁止する。

- 巨大な`utils.ts`
- 巨大な`helpers.ts`
- 巨大な`actions.ts`
- React Component内への複雑な業務ロジック
- Role判定の散在
- DBアクセスの散在
- Validationの重複
- Security logicの重複
- Feature間の循環依存
- 他Domainの内部DB構造への無制限な依存
- User / Department / Organization等の共通概念の重複定義

FeatureまたはDomain単位でコードの所在を理解できること。

---

# 30. Error Handling

内部エラーとユーザー向けエラーを分離する。

悪い例：

```text
duplicate key value violates unique constraint...
```

良い例：

```text
この社員番号はすでに登録されています。
```

ログでは原因調査できること。

---

# 31. Database Migration

Migration必須。

本番DBを手作業で変更することを前提にしない。

最低限：

```text
organizations
departments
users
roles
user_roles
audit_logs
equipment
```

相当のSchemaを持つ。

Foreign Keyを適切に設定する。

削除時挙動を明示する。

---

# 32. Seed

開発環境用Seedを提供する。

例：

```text
Organization:
KUMUNO Demo Company

Departments:
Administration
Sales
Development

Admin:
admin@example.com
```

初期パスワードを安全に扱う。

READMEへ説明する。

---

# 33. Testing

v0.1から自動テストを導入する。

特に優先：

```text
Authentication
Authorization
Validation
Audit Log
CLI generation
```

そして非常に重要なのが、

> **生成されたプロジェクトが正常にbuildできること**

を自動テストする。

---

# 34. CLI Integration Test

可能であればCI上で、

```bash
create-kumuno test-app
cd test-app
npm install
npm run typecheck
npm run test
npm run build
```

相当を実行する。

これによって、

> npmパッケージは公開できたが生成物が壊れている

という状態を防ぐ。

---

# 35. CI

GitHub Actions等を利用し、

最低限：

```text
lint
typecheck
test
build
CLI generation test
```

を実行する。

---

# 36. License

KUMUNO本体・CLI・生成テンプレートは、ユーザー決定（2026-10-01）により**MIT License**を採用する。

依存ライブラリのライセンスは各パッケージ自身の許諾を維持し、本体のMITへ置き換えない。

依存ライブラリのLicenseも確認する。

---

# 37. README戦略

READMEの冒頭では、

```text
Next.js
PostgreSQL
TypeScript
```

を主役にしない。

最初に、

# AIで小さく作る。でも、将来つながる。

と説明する。

その後、

```text
$ npx create-kumuno my-app
```

を大きく見せる。

---

# 38. README Quick Start

READMEを開いたユーザーが30秒以内に、

```bash
npx create-kumuno my-app
```

を理解できること。

長い設計思想をQuick Startより先に置かない。

---

# 39. v0.1で実装しないもの

Codexは以下を勝手に実装しない。

- KUMUNO Cloud
- AI API
- Chat UI
- No-code builder
- Drag & Drop builder
- Generic Form Builder
- Generic Workflow Engine
- Approval Workflow
- Excel
- PDF
- A4 Report Engine
- Email
- Slack
- Teams
- LDAP
- Active Directory
- SSO
- SQLite
- SaaS multi-tenancy
- Billing
- Mobile App
- Microservices
- Message Broker
- Generic Integration Platform
- Event Bus infrastructure

---

# 40. Future CLI

将来的に、

```bash
npx kumuno add approval
npx kumuno add excel
npx kumuno add print
npx kumuno add file-upload
```

などを検討する。

ただしv0.1では実装しない。

---

# 41. 将来の重要思想：Copy over Dependency

将来的な`kumuno add`では、

> KUMUNOランタイムへ依存させる

より、

> 必要なコードをユーザーのプロジェクトへ追加し、ユーザーが所有する

方式を優先的に検討する。

目的：

- Lock-in回避
- AIによる編集容易性
- 長期保守性
- Transparency

---

# 42. v0.1開発順序

## Milestone 0

技術設計。

Repository / DB / Authentication / Validation / Testingに加え、Shared Core、Business Domain境界、Stable ID、将来の部署間連携方針を決定する。

まだコード変更禁止。

## Milestone 1

Repository構成。

## Milestone 2

Template Next.js Application。

## Milestone 3

PostgreSQL / Migration。

## Milestone 4

Organization / User。

## Milestone 5

Authentication。

## Milestone 6

Authorization / RBAC。

## Milestone 7

Audit Log。

## Milestone 8

Business UI。

## Milestone 9

Equipment Reference Application。

## Milestone 10

AI Documentation。

## Milestone 11

create-kumuno CLI。

## Milestone 12

CLI Integration Test。

## Milestone 13

README / OSS Documentation。

## Milestone 14

npm package preparation。

## Milestone 15

v0.1 Release Candidate。

---

# 43. v0.1 Acceptance Test A

新しいPCまたはクリーン環境で、

```bash
npx create-kumuno my-company-app
```

を実行。

READMEの指示だけで起動できる。

---

# 44. v0.1 Acceptance Test B

生成されたアプリで、

- Login
- Logout
- User
- Department
- RBAC
- Equipment CRUD
- Audit Log

が動作する。

---

# 45. v0.1 Acceptance Test C

生成されたプロジェクトで、

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

が成功する。

---

# 46. v0.1 Acceptance Test D — 最重要

生成したアプリをCodexまたはClaude Codeで開く。

以下のような指示を出す。

```text
社員研修管理機能を追加してください。

社員ごとに、

・研修名
・受講日
・有効期限
・修了状況
・備考

を管理したいです。

KUMUNOの既存設計と規約に従って実装してください。
```

AIが、

- docsを読む
- EquipmentをReferenceにする
- DB Migrationを作る
- Validationを作る
- Authorizationを適用する
- Audit Logを残す
- UIを追加する
- Testsを追加する

こと。

このテストが成功することを、

**KUMUNO v0.1の最重要成功条件**

とする。

---

# 47. v0.1 Acceptance Test E

同じ生成プロジェクトをClaude CodeとCodexの双方が理解できること。

完全に同じコードを生成する必要はない。

しかし、

**KUMUNOのArchitectureとCoding Conventionを双方が正しく理解できること**

を確認する。

---

# 48. v0.1 Acceptance Test F — Integration Readiness

Equipment Reference Application完成後、仮想的に別部署が利用する `Training Management` を追加する設計レビューを行う。

この時点ではTraining Managementをv0.1必須実装にしない。

レビューでは以下を確認する。

- Userを再定義せず既存Userを利用できる
- Departmentを再定義せず既存Departmentを利用できる
- Equipment Domainへ不要な依存を作らない
- Training固有データをShared Coreへ混入させない
- 将来API連携へ切り出せるBusiness Logic境界がある
- 既存機能を壊さず新Domainを追加できる

このレビューに失敗する場合、Architectureをv0.1公開前に見直す。

---

# 49. v0.1 Acceptance Test G — Department Collaboration Scenario

以下の将来シナリオを設計上説明できること。

```text
人事部がUser / Departmentを管理
        ↓
総務部がEquipment Managementを利用
        ↓
教育担当がTraining Managementを追加
        ↓
各システムが同じUser / Departmentを参照
```

このためにv0.1でマイクロサービスを導入する必要はない。

重要なのは、将来の連携を阻害する重複データモデルや密結合を作らないことである。

---

# 50. Codex開発ルール

Codexは以下を遵守する。

## Rule 1

勝手に全機能を実装しない。

## Rule 2

各Milestoneを小さく完了する。

```text
Design
↓
Implementation
↓
Test
↓
Documentation
↓
Reviewable state
```

までを1単位とする。

## Rule 3

重要な技術選定を勝手に決めない。

候補・利点・欠点・推奨を提示する。

## Rule 4

新規dependency追加時には、

- Purpose
- Maintenance
- License
- Alternatives
- Necessity

を確認する。

## Rule 5

不要な抽象化を禁止する。

## Rule 6

将来機能を先回りして実装しない。

## Rule 7

Securityに関するShortcutを禁止する。

## Rule 8

仕様変更時にはdocsも更新する。

## Rule 9

lint / typecheck / test / buildを確認する。

## Rule 10

既存コードを変更するときは、なぜ変更するか説明可能な状態にする。

---

# 51. 非目標

KUMUNOは、

**kintoneクローンではない。**

**Pleasanterクローンではない。**

**NocoBaseクローンではない。**

ノーコードプラットフォームを作ることが目的ではない。

---

# 52. KUMUNOのポジション

```text
No-code / Low-code

kintone
Pleasanter
NocoBase
Baserow

────────────────────

AI + Code

KUMUNO
      ↓
Next.js
TypeScript
PostgreSQL
      ↓
User owns the code
```

---

# 53. プロジェクト哲学

従来：

> プログラミングできないからノーコードを使う。

KUMUNO：

> **AIがコードを書けるなら、ユーザーがコードを所有できる形で業務システムを作ろう。**

KUMUNOはそのための安全な土台を提供する。

---

# 54. 成功指標

v0.1の成功はGitHub Star数では判断しない。

第一成功指標：

> **開発者本人以外の人が `npx create-kumuno` を実行し、AIと一緒に実際の業務機能を作れること。**

その後、

```text
1 user
↓
10 users
↓
100 users
↓
contributors
```

を目指す。

---

# 55. 最終ビジョン

OSS：

```bash
npx create-kumuno
```

↓

AI：

```text
何を作りたいですか？
```

↓

ユーザー：

```text
会社の備品購入申請を作りたい。
```

↓

AI + KUMUNO：

```text
Requirements
Database
Authentication
Authorization
Audit
Business Logic
UI
Tests
```

↓

業務システム完成。

そして長期的には、

# KUMUNO Cloud

によって、

**サーバー・DB・バックアップ・更新すら意識せず、業務を知っている人自身がシステムを作れる世界**

を目指す。

---

# 56. Codexへの初回指示（初期設計時の記録）

v3.1更新時点で初期設計の確認は完了済み。以下は初回比較の記録であり、継続開発を毎回停止する指示ではない。現在はarchitecture.mdの完了工程とユーザーが承認した次工程に従う。Prisma・Better Authの採用決定を維持する。

この文書をKUMUNO v0.1の最上位仕様として扱ってください。

ただし、

**まだコードを書かないでください。**

最初の回答では以下のみ実施してください。

### 1. 仕様理解

KUMUNOが何を作ろうとしているプロジェクトなのか、自分の言葉で整理してください。

### 2. Repository Architecture

以下を比較してください。

```text
Monorepo
Single Repository
Multiple Repositories
```

`create-kumuno` とTemplate Applicationの管理方法を含めて提案してください。

### 3. Integration-ready Architecture

以下を提案してください。

- Shared CoreとBusiness Domainの境界
- User / Organization / Departmentの共有方法
- Stable ID方針
- Feature間依存ルール
- 将来API連携を追加しやすいBusiness Logic境界
- v0.1で過剰設計を避けるため「今は実装しないもの」

特に、将来複数部署が別々の業務機能を追加してもデータモデルが分断されないことを重視してください。

### 4. Database Technology

以下を含めて比較してください。

```text
Drizzle
Prisma
Kysely
node-postgres
その他適切な候補
```

### 5. Authentication

KUMUNOに適したAuthentication方式を提案してください。

特定SaaSへの必須依存は避けてください。

### 6. Validation

Validation libraryを比較・提案してください。

### 7. Testing

Unit / Integration / CLI generation testの構成を提案してください。

### 8. CLI Architecture

`create-kumuno` の実装方式を提案してください。

特に、

```text
Template Copy
Code Generation
Git Template
Package-based
```

などを比較してください。

### 9. npm Release

`npx create-kumuno` として公開するためのパッケージ構成を提案してください。

### 10. Security Risks

v0.1で注意すべきSecurity Riskを列挙してください。

### 11. Milestones

このMaster Specificationを実装可能な小さなMilestoneへ分割してください。

---

以上を提示した後、

**実装を開始せず、私の承認を待ってください。**

勝手にScopeを追加しないでください。

最優先事項は、

> **小さく、理解可能で、安全で、AIが扱いやすい業務システム基盤を完成させること。**

そしてv0.1では、

> **`npx create-kumuno` → AIに業務を説明 → KUMUNOの規約に沿った機能が完成する**

という一連の体験を完成させることを最優先してください。
