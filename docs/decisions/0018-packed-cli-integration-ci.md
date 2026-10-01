# 0018: 配布CLIの結合テストとCI

- 日付: 2026-10-01
- 状態: 採用

## 背景

Milestone 11で同梱テンプレートと実tgzからの生成・checkを検証した。仕様書第34・35章に従い、配布物のDB・認証・業務機能もクリーン環境で継続検証する。

## 決定

npm run test:pack:dbを追加する。npm packで作ったtgzをリポジトリ外へインストールし、その実行入口からアプリを生成・依存導入する。生成物のlint・型・単体・本番ビルド・ブラウザースモークに続けて、環境ファイルによるDB接続、MigrationとSeedの初回/再実行、DB結合テストと認証/管理/備品のブラウザーテストを実行する。

既存のtest:template:dbとDB検証処理を共有する。専用TEST_DATABASE_URLを事前検査し、DB名が_testで終わらない場合や未設定は失敗する。DATABASE_URLへ代替接続しない。UUID由来の一意なschemaのみ作成・削除し、資格情報ファイルはmode 0600で作成、失敗時も除去する。失敗時の生成物は調査用に保持する。

GitHub ActionsのCIはUbuntu・Node.js 24・PostgreSQL 18のservice container・Chromiumを使い、rootのcheckとtest:pack:dbを順次実行する。push(main)、Pull Request、手動実行を対象とする。GitHub権限はcontents: read、checkoutで認証情報を保持しない。公式Actionsはcommit SHAで固定し、npm cacheをlockfile別に利用する。新規依存は追加しない。

CI用DBは使い捨てサービス。固定のCI専用パスワードはこのサービスだけで使用し、実運用の資格情報やSecretsは不要。npm公開・デプロイは行わない。Windows、npm Registry経由の実行、公開版は別工程。

## 参考

- [GitHub公式: PostgreSQL service containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)
- [actions/setup-node](https://github.com/actions/setup-node)
- [CI workflow](../../.github/workflows/ci.yml)
