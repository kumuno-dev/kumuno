# 手元で試す

Node.js 24.xとnpmがあれば、PostgreSQLやDockerを別途インストールせずに試せる。初回のnpm ciではネットワークが必要。一般ユーザーとして実行し、sudoは使わない。

```sh
npm ci
npm run dev:local
```

表示されたURLを開く。初期管理者のメールはadmin@example.com。初期パスワードはこのアプリの`.kumuno/local/login.txt`をエディターで開いて確認する。ファイルは秘密情報なのでGit・チャットへ貼り付けない。管理者パスワードをアプリ側で変更した場合、再起動で初期値へ戻すことはない。

初回に専用PostgreSQL 18.4を起動し、開発／shadow／テストDB、ランダムなDBパスワード・認証鍵、.env.local、開発用組織・部署・管理者を準備する。MigrationはPrismaの既存SQLを適用し、Seedは既存ID・編集内容・パスワードを保持する。続けてNext.js開発サーバーが起動する。

終了はCtrl+C。アプリとDBは停止し、データは.kumuno/local/postgresに保持する。次回もnpm run dev:localで起動する。使用中のアプリポート3000は初回のみ別の空きポートを選ぶ。アプリ・DBとも127.0.0.1へ限定する。

## 既存DBと本番

既存の.env.localや接続環境変数があれば、dev:localは上書きせず拒否する。手動設定したDBはREADMEの手順とnpm run devを使う。自動生成した.env.localを編集した場合も、その後dev:localは設定変更を拒否する。不要な設定ファイルを自動削除することはない。

本番運用の構築、ネットワーク公開、バックアップ、TLS、管理者プロビジョニングは対象外。NODE_ENV=productionでは拒否する。npm startとbuildから開発DBは起動しない。embedded-postgresは開発依存だけであり、Prisma / PostgreSQLの本番接続方式は従来どおり。

## 保存先と保守

.kumuno全体はGit・CLI配布の対象外。.env.local、settings.json、login.txtはmode 0600、保存ディレクトリは0700（WindowsではOSのアクセス権を確認する）。設定・DBを同時に複製する場合は同じ資格情報が含まれるため、秘密として扱う。

アプリ接続ロールはスーパーユーザーではない。DB初期化だけをローカル管理用ロールで行う。shadow DBは開発DBとは別。新しいMigration作成手順は[database.md](database.md)。テストは別のkumuno_local_testを使い、開発データを削除しない。DB起動中に専用TEST_DATABASE_URLを設定してtest:db / test:authを実行できるが、Next.jsの同じ出力先を使う本番ビルドと開発サーバーを同時に走らせない。

ローカルDBはdev:localの起動中だけ利用できる。バイナリの対応OSは依存の対応範囲に従う。実際の検証環境はKUMUNO本体の検証記録を確認する。初回の依存導入でoptional依存やinstall scriptsを無効化すると起動できない場合がある。

| 状況 | 対応 |
| --- | --- |
| Node.js 24.xの案内 | Node.js 24へ切り替えてnpm ciを実行 |
| 既存.env.local・環境変数を拒否 | 既存DBは通常のnpm run devを使用 |
| 起動中の案内 | 同じアプリのdev:localを止める |
| 異常終了後run.lockだけ残った | アプリとDBが停止していることを確認し、.kumuno/local/run.lockだけを除去。DB・settingsは消さない |
| ポート使用中 | 前の起動を終了し、表示されたポートを他のプロセスが利用していないか確認 |
| DB起動失敗 | npm ciを再実行し、install scripts・対応OS・書込み権限を確認。DBデータを自動リセットしない |

実装はscripts/dev-local.tsとscripts/local-postgres.ts。前者がプロセスの開始・停止とMigration / Seedを管理し、後者は専用DBだけを起動する。資格情報は標準出力へ表示しない。
