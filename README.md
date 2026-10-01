# KUMUNO

> AIで小さく作る。でも、将来つながる。

AI coding agentsのための、オープンソース業務システム開発基盤。
業務を知っている人とAIが共通の基盤を使い、必要な機能を小さく「組む」ためのプロジェクトです。

KUMUNO is an open-source foundation for building business applications with AI coding agents.

**公開候補版0.1.0-rc.0をnpmへ公開しました。MIT Licenseです。** Node.js 24.xで、次のコマンドから試せます。正式版v0.1の確認は継続中です。

```sh
npx create-kumuno@next my-app
```

[公式サイト](https://kumuno.jp) · [GitHub](https://github.com/kumuno-dev/kumuno) · [ドキュメント](docs/README.md)

## npm版を試す

生成後はmy-appへ移動してnpm run devを実行します。ログイン・業務画面には生成先READMEのPostgreSQL・認証・Migration・開発Seedの設定が必要です。

[公開パッケージ](https://www.npmjs.com/package/create-kumuno)は現在、nextとlatestの両タグが0.1.0-rc.0を指しています。npm側がlatest削除を400で拒否したため、候補版であることを明示し、試用では@nextを指定します。

## ソースからローカルで試す

Node.js **24.x**、npm、Gitを用意し、次を実行します。

```sh
git clone https://github.com/kumuno-dev/kumuno.git
cd kumuno
npm ci
npm run create:app -- my-app --install
cd my-app
npm run dev:local
```

開発用PostgreSQL・認証設定・初期管理者を自動準備します。表示されたURLからログインでき、初期パスワードは生成先の`.kumuno/local/login.txt`で確認できます。Ctrl+Cで終了し、次回も同じコマンドで再開できます。DBの別途導入は不要です。詳しくは[開発用セットアップ](templates/default/docs/local-development.md)を参照してください。

医療機器台帳（登録・編集・検索）と貸出・返却・履歴・点検・修理・合格後の再貸出、任意のテストデータと医療ダッシュボードもソース版に追加しました。ログイン後のメニューから試せます。[台帳の仕様](templates/default/docs/medical-equipment.md)を参照してください。現在のnpm版には未収録です。

この簡単セットアップは次の候補版0.1.0-rc.1向けの変更で、現在のnpm版rc.0には未収録です。公開前はソースから試してください。

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

Milestone 14のnpm公開とRegistryからの生成・DB検証まで完了しました。v0.1 Release CandidateのAcceptance Test確認が残っています。[公開手順](docs/releasing.md)を参照してください。Windows、本番TLS・プロキシ・バックアップ復旧は未検証です。本番初期管理者の自動作成、公開サインアップ、パスワードリセットは未実装です。[運用の前提](templates/default/docs/deployment.md)を確認してください。

## ライセンス

KUMUNO本体・CLI・生成テンプレートは[MIT License](LICENSE)です。CLIと生成アプリにもLICENSEを同梱します。依存ライブラリは各パッケージ自身のライセンスに従います。[依存ライセンスの確認記録](docs/dependency-licenses.md)を参照してください。

共通機能をnpmパッケージとして組み合わせる構成へ移行しています。最初の[@kumuno/auth](packages/auth/README.md)は未公開のRC候補です。既存アプリへの導入は実tgzで検証し、CLIへも同梱します。[構成と追加順](docs/package-architecture.md)を参照してください。
