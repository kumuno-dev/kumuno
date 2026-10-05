# KUMUNO

> AIで小さく作る。でも、将来つながる。

AI coding agentsのための、オープンソース業務システム開発基盤。
業務を知っている人とAIが共通の基盤を使い、必要な機能を小さく「組む」ためのプロジェクトです。

KUMUNO is an open-source foundation for building business applications with AI coding agents.

**公開候補版0.1.0-rc.1をnpmへ公開しました。MIT Licenseです。** Node.js 24.xで、次のコマンドから試せます。正式版v0.1の確認は継続中です。

```sh
npx create-kumuno@next my-app
```

[公式サイト](https://kumuno.jp) · [GitHub](https://github.com/kumuno-dev/kumuno) · [ドキュメント](docs/README.md)

## npm版を試す

生成時に依存導入を選び、生成後はmy-appへ移動して `npm run dev:local` を実行します。開発用PostgreSQL・認証・初期管理者を自動準備します。Node.js 24.xが必要です。

[公開パッケージ](https://www.npmjs.com/package/create-kumuno)のnextは0.1.0-rc.1、latestは従来の0.1.0-rc.0です。新しい候補版を試す場合は@nextを指定します。正式版のlatestへの更新は別工程です。

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

医療機器台帳（登録・編集・検索）と貸出・返却・履歴・点検・修理・合格後の再貸出、任意のテストデータと医療ダッシュボードもソース版に追加しました。ログイン後のメニューから試せます。[台帳の仕様](templates/default/docs/medical-equipment.md)を参照してください。npmの@next版から利用できます。

この簡単セットアップはnpm公開済み0.1.0-rc.1から利用できます。

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

共通機能をnpmパッケージとして組み合わせる構成へ移行しています。最初の[@kumuno/auth](packages/auth/README.md)はnpm公開済み0.1.0-rc.0のRC候補です。既存アプリへの導入は実tgzで検証し、CLIへも同梱します。[構成と追加順](docs/package-architecture.md)を参照してください。

第2段階として[@kumuno/rbac](packages/rbac/README.md)も抽出しました。3ロール・組織境界の共通判定に、アプリ側で業務権限を追加できます。npm公開済みの同一版の実tgzを生成テンプレートへ同梱します。

第3段階として[@kumuno/audit-log](packages/audit-log/README.md)も抽出しました。業務更新と同じtransactionへ保存関数を結びつけ、監査に残す属性はアプリ側で明示します。npm公開済みの同一版のtgzをCLIに同梱します。

第4段階として[@kumuno/approval](packages/approval/README.md)の最小状態遷移を追加しました。申請・理由付き差戻し・再申請・承認、自己承認禁止と版番号の確認を提供し、[実DBへの保存例](examples/approval/README.md)でRBAC・監査と組み合わせます。承認画面・業務DBモデルは未実装、npmへ0.1.0-rc.0を公開済みです。

共通パッケージは `npm install @kumuno/auth@next @kumuno/rbac@next @kumuno/audit-log@next @kumuno/approval@next` で個別導入できます。authはBetter Auth 1.7.6をpeer dependencyとします。DB・UIの接続は利用アプリ側で用意します。[公開記録](docs/releases/2026-10-02-rc1.md)を参照してください。

ソース版の次の候補0.1.0-rc.2には[@kumuno/print](packages/print/README.md)と医療機器の[台帳票](templates/default/docs/print.md)を追加しました。A4印刷・ブラウザーでのPDF保存に対応します。この追加分はnpm未公開です。

同じソース候補に[@kumuno/csv](packages/csv/README.md)と医療台帳の[CSV出力](templates/default/docs/csv.md)を追加しています。検索・テストデータ選択を反映して全ページを出力できます。CSV形式の読込検証を共通化し、医療台帳には確認付き新規一括登録を追加しました。xlsxは後続です。npm未公開です。

ソース版の医療台帳に、全行の確認付きCSV新規一括登録を追加しました（128KiB・100台まで）。既存番号は上書きせず、登録後は点検待ちです。npm未公開です。

ソース版rc.2候補にアプリ内通知を追加。CSV一括登録の完了を本人へ通知し、未読・既読を確認できる。[通知仕様](templates/default/docs/notifications.md)を参照。npm公開は別工程。

ソース版rc.2候補では@kumuno/adminのユーザー/部署入力欄・共通送信フォームを利用する。Reactアプリへの独立導入が可能で、認可と保存は利用アプリが所有する。npm公開は別工程。
