# デプロイと運用の前提

Node.js 24.xで動くNext.jsサーバーとPostgreSQL 18.xを用意する。デプロイ先サービスは固定しない。ログイン・管理画面・備品はDBとサーバーを使うため、静的HTMLだけの配信には対応しない。このアプリの本番デプロイはまだ検証していない。

## 設定

| 設定 | 内容 |
| --- | --- |
| DATABASE_URL | アプリ用ロールの接続先。接続URLとパスワードをGit／ログへ出さない |
| BETTER_AUTH_URL | ブラウザーでアクセスするHTTPSの固定Origin。パスやqueryを付けない |
| BETTER_AUTH_SECRET | 32文字以上のランダムな秘密。全インスタンスで共有し、秘密管理機構から渡す |
| AUTH_TRUSTED_IP_HEADER | 任意。信頼できるプロキシが上書きするIPヘッダーだけを指定する |

[認証規約](authentication.md)のOrigin・Cookie・IP試行制限の前提を満たす。プロキシは正しいHost／Originを扱い、指定したIPヘッダーを利用者の値のまま転送しない。アプリOriginへの直接アクセスを防ぐ。指定しない場合は共有の試行制限になる。

本番のリモートDBは環境に合うTLS検証を構成する。アプリ用ロールとDDLを行うMigration用ロールを分ける。監査トリガーを無効化できるDB所有者やsuperuserを通常アプリの接続に使わない。

## リリース手順

1. lockfileを含むコードを取得し、Node.js 24.xでnpm ciする。Prisma Clientはpostinstallで生成される。
2. 自動チェックと必要な実DB・ブラウザー検証を完了する。DBのバックアップと復旧手順を用意する。
3. 一度だけMigration用ロールでdb:migrateを実行する。既存Migrationを変更せず、新しいものを適用する。Web起動時の自動Migration、db push、resetは使わない。
4. アプリ用の設定で本番ビルドを行い、Next.jsサーバーを起動する。

```sh
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

この起動例は同じホストのHTTPSプロキシ経由で公開する場合。コンテナやサービスでは待受アドレス・ポートを環境に合わせる。buildだけならDB設定がなくても成功するが、ログインや業務画面の利用には設定とMigrationが必須。

Migration実行時は、デプロイ環境の秘密管理機構からその処理だけにDATABASE_URLを渡してnpm run db:migrateを実行する。アプリ起動時にはアプリ用ロールのURLへ戻す。接続先をコマンドや公開ログへ直書きしない。

## 初期管理者・運用確認

開発用Seedは本番では拒否される。本番初期管理者の自動プロビジョニングは未実装。公開サインアップ・パスワードリセット／変更強制・本人への初期パスワード通知も未実装なので、初期アカウントの運用方法を用意してから実利用へ移る。

HTTPSのCookie、ログイン・ログアウト、保護ページ、無効ユーザー、Origin拒否、試行制限、備品更新と監査をデプロイ先で確認する。ログには安全なエラーコードを出し、秘密・DB生エラー・HTTP本文を保存しない。監査の通常UPDATE / DELETE / TRUNCATEはDBが拒否するが、DB管理者による改変を防ぐ外部証跡は未実装。

アプリPoolは各インスタンスで最大10接続。複数台ではDB接続数を合算する。Server Actionsを複数インスタンスで運用する場合は同じビルド成果物を配布し、暗号鍵・プロキシ設定を採用版Next.jsのnode_modules/next/dist/docs/01-app/02-guides/self-hosting.mdで確認する。

本番DBをテストへ使わない。TEST_DATABASE_URLは専用_test DB、shadow DBはMigration作成用の独立DB。schemaを作って削除するテストには権限が必要。Migration失敗時のresolveは[database.md](database.md)に従い、実DBの状態を確認してから実行する。

## 未確認の範囲

本番TLS・プロキシ・複数台・大量データ性能・OS差・バックアップ復旧はこのアプリのローカル検証で保証していない。備品の編集開始後に別ユーザーが更新したことをUIで検出する楽観ロックも未実装。デプロイ先の手順と検証結果をこの文書へ追加する。
