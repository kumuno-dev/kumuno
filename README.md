# KUMUNO

> AIで小さく作る。でも、将来つながる。

AI coding agentsのための、オープンソース業務システム開発基盤。
業務を知っている人とAIが共通の基盤を使い、必要な機能を小さく「組む」ためのプロジェクトです。

KUMUNO is an open-source foundation for building business applications with AI coding agents.

**公開準備中です。MITを採用し、npm版は未公開です。** 公開後の開始コマンドは次を予定しています。

```sh
npx create-kumuno my-app
```

[公式サイト](https://kumuno.jp) · [GitHub](https://github.com/kumuno-dev/kumuno) · [ドキュメント](docs/README.md)

## 今すぐローカルで試す

Node.js **24.x**、npm、Gitを用意し、次を実行します。

```sh
git clone https://github.com/kumuno-dev/kumuno.git
cd kumuno
npm ci
npm run create:app -- my-app --install
cd my-app
npm run dev
```

[http://localhost:3000](http://localhost:3000)でトップページを確認できます。この段階ではDBは不要です。ログイン・業務画面を使う場合は、生成先READMEに従って**PostgreSQL 18.x → 環境設定 → Migration → 開発Seed**を準備してください。生成先だけで開発・保守できます。

対話で依存導入を選ぶ場合は--installを省略します。生成だけなら--no-installを指定し、生成先でnpm ciを実行します。既存ディレクトリは上書きしません。[CLIオプション](packages/create-kumuno/README.md)を参照してください。

試用アプリは製品リポジトリへcommitせず、別のGitリポジトリで管理してください。

## 生成されるもの

| 機能 | 現在の内容 |
| --- | --- |
| 認証 | メール・パスワード、ログイン・ログアウト、DBセッション、無効ユーザー拒否 |
| 共有マスタ・認可 | 組織、階層部署、ユーザー、ADMIN / MANAGER / USER、組織境界 |
| 管理画面 | 共通ナビゲーション、ユーザー作成・編集・無効化、部署作成・編集・削除 |
| 備品管理 | CRUD、検索、ページング、並び替え、権限確認 |
| 監査 | 業務更新と同じtransactionで保存する追記専用ログ |
| AIと開発 | AGENTS.md / CLAUDE.md、機能追加手順、設計・DB・認証・運用の文書 |

Next.js・React・TypeScript・Tailwind CSS・PostgreSQL・Prisma・Better Authを使います。外部AI APIや認証SaaSを組み込まず、通常のWebアプリとして拡張できます。

共有のUser / Departmentを基準に、各業務機能が自分のデータを持ちます。備品管理を参照しながら、人事・教育など次の機能を組める構成です。[機能追加手順](templates/default/docs/adding-a-feature.md)と[Domain境界](docs/domain-boundaries.md)を参照してください。

## 開発に参加する

- [貢献方法](CONTRIBUTING.md): 不具合報告、機能提案、Pull Request、AIとの作業
- [開発・検証ガイド](docs/development.md): 本体のセットアップ、DB、テスト、CI
- [文書一覧](docs/README.md): 製品仕様と生成アプリの文書
- [セキュリティ方針](SECURITY.md): 報告方法と検証範囲
- [変更履歴](CHANGELOG.md): 公開準備中の機能

## 現在地と公開まで

Milestone 13まで完了し、配布tgzからの生成・ビルド・DB・認証・業務画面をmacOSとUbuntuのCIで検証済みです。[CI](https://github.com/kumuno-dev/kumuno/actions/workflows/ci.yml)と[工程・検証実績](docs/architecture.md)を参照してください。

create-kumuno@0.1.0-rc.0をnextタグ向けに準備しています。npm公開とv0.1 Release Candidateの確認が残っています。[公開手順](docs/releasing.md)を参照してください。Windows、npm Registryからの実行、本番TLS・プロキシ・バックアップ復旧は未検証です。本番初期管理者の自動作成、公開サインアップ、パスワードリセットは未実装です。[運用の前提](templates/default/docs/deployment.md)を確認してください。

## ライセンス

KUMUNO本体・CLI・生成テンプレートは[MIT License](LICENSE)です。CLIと生成アプリにもLICENSEを同梱します。依存ライブラリは各パッケージ自身のライセンスに従います。[依存ライセンスの確認記録](docs/dependency-licenses.md)を参照してください。
