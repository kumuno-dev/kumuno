# 構成と実装工程

## 現在の範囲

ユーザー承認済みのStep 1のみを実装する。最上位仕様は[master-spec.md](master-spec.md)。Step 1完了はv0.1の完成を意味しない。

Step 1は実装・検証済み（2026-09-27、macOS arm64、Node.js 24.21.0、npm 11.5.2）。`npm ci`、依存ツリー確認、lint、型チェック、本番ビルド、Playwrightの4件が成功した。開発サーバーでもPC・スマートフォン表示を確認した。他のOS・ブラウザーでの検証は後続工程で行う。

```text
src/app/                  App Router、ルートレイアウト、トップページ、404、CSS
tests/e2e/                実際の本番ビルドを使うブラウザースモークテスト
docs/                     最上位仕様、構成、設計判断
```

トップページはServer Component。Client Component、DB、認証、API、業務サービスはまだない。外部フォント・AI API・認証SaaSへの接続も不要。Tailwind CSSはPostCSSでビルドする。

Next.jsによるエージェント規約ファイルの自動書き換えは`agentRules: false`で無効化し、プロジェクト規約を手動管理する。フレームワークAPIの確認にはインストール版同梱の`node_modules/next/dist/docs/`を利用する。

## 後続の配置方針（未実装）

`database/`、`authentication/`、`authorization/`、`audit/`は`src/`直下に責務別で置く。業務機能は`src/features/<feature>/`にまとめ、その中でdomain・validation・service・repository・actions・固有UIを分離する。共通UIは`src/components/`に置く。必要な工程で追加し、空の抽象層は先に作らない。

DBはPostgreSQL、アクセス層はDrizzle ORM + pg、SQL MigrationはDrizzle Kitを推奨しているが、未導入。認証はBetter Authを条件付き候補とする。標準のAccountへのパスワード保存は仕様の`User.passwordHash`と異なるため、**仕様変更の承認なしに採用しない**。ユーザースキーマ作成前に確定する。

ValidationはZod、業務ロジックの単体・結合テストはVitestを候補とする。Step 1には対象業務がないため、これらはまだ追加しない。

## 工程

1. プロジェクト初期化、README、検証環境（今回の範囲）
2. PostgreSQL接続とMigration
3. User / Organization / Department、開発Seed
4. Authentication
5. Authorization / RBAC
6. Header / Sidebar、ユーザー・部署管理画面を小分けに実装
7. Audit Logと既存の管理操作への組み込み
8. 備品管理（一覧・詳細・検索・ページ・並び替え、続いて登録・編集・削除）
9. 結合テスト・E2E・異常系の補強
10. 指定ドキュメント完成とv0.1受け入れ評価

テストは各工程で追加する。Step 9まで後回しにしない。ユーザー・部署管理は最上位仕様第24章の必須条件に含まれる。ドキュメントの残りも対象工程に合わせて作成する。

## Step 1の完了条件

- Node.js 24とREADMEの手順で依存を再現できる。
- `npm run dev`でトップページを表示できる。
- `npm run check`が成功する（lint・型チェック・本番ビルド・スモークテスト）。
- PC・スマートフォンで日本語ページと404からの復帰を確認できる。
- 業務機能、DB、認証の未実装状態をREADMEで明示する。
- 秘密情報・生成物・依存パッケージをGitへ含めない。
