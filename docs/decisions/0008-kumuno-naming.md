# 0008: KUMUNOの名称とリポジトリ

2026-09-28。ユーザーのリポジトリ移管・改名指示に基づき、名称を以下へ統一する。

- 製品表示：KUMUNO
- 開発用root・テンプレートpackage名：kumuno
- CLI package / bin / workspace：create-kumuno-app
- リポジトリ：https://github.com/kumuno-dev/kumuno
- 新規DB設定例：kumuno / kumuno_test / kumuno_shadow

CLIディレクトリ、実行パス、lockfile、画面タイトル、テスト、仕様書、設計文書も更新する。過去の選定記録内の製品名・CLI名も現名称へ揃えるが、新しいnpm名を過去に確認済みとは扱わない。npmの公開可否は公開工程で確認する。

既存DB・DBロール・利用者の環境ファイル・Macの作業ディレクトリは改名しない。既存の接続先を利用する場合は従来のDATABASE_URLをそのまま使える。SQL Migrationの内容は変更しない。生成済みの別アプリへ自動で改名を波及させない。

Git originは指定された移管先へ変更する。commit・push・npm公開はこの変更だけでは行わない。

検証結果：npm ci、npm run check、test:template、test:template:dbが成功。CLI3件・単体10件・ブラウザー4件、生成物の同検証と実DB6件を確認。既存DB名への接続・Migrationも成功。管理対象コード・設定・文書とファイルパスの名称残存は0件。ローカル作業フォルダとGit履歴、生成済みの別アプリは対象外。

## 作業ディレクトリの変更

追加のユーザー指示により、作業フォルダを/Users/takeshi/development/kumunoへ改名した。Git履歴と未コミット変更は保持する。

プロジェクト内に実接続用.env.local / .env.test.localはなく、DB接続環境変数も未設定。ローカル5432の待受けとPostgreSQLプロセスは確認できなかった。これまでの検証用DBは停止・削除済みで、改名対象の永続DBは確認できない。DBとロールの設定例はkumuno / kumuno_test / kumuno_shadowへ統一済み。別途用意されたDBがある場合は接続先を確認してから変更する。
