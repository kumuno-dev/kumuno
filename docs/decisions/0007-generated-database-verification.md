# 0007: 生成アプリのPostgreSQL検証

Milestone 3として、既存のPrisma基盤をCLI生成物でも検証する。test:template:dbはTEST_DATABASE_URLだけを対象とし、_testで終わる専用DBを必須とする。開発用DATABASE_URLへ代替接続しない。

実CLIから一時ディレクトリへ生成しnpm ciを実行する。そのアプリにインストールされたpgを使用して一意なschemaを作る。生成READMEと同じ.env.local / .env.test.localを一時的に書き、子プロセスへDB URLの環境変数を渡さず、接続確認・Migration・再適用・既存の実DB結合6件を実行する。

Migrationの初回成功履歴が存在し、二回目で増えないことも検査する。テスト用schemaだけを終了時に削除する。一時環境ファイルは失敗時も削除し、DBエラー詳細を追加出力しない。強制終了時はfinallyを実行できない場合があるため、一時生成先と専用DBの残存schemaを確認する。

追加依存はなく、生成アプリのpg・Prismaをそのまま使う。shadow DBを必要とする新規SQL生成の自動化、業務モデル、Seed、認証実装は本工程には含めない。

検証結果：PostgreSQL 18.4で生成物の接続・Migration二回適用・実DB6件が成功。設定不足/不適切なDB名の拒否と秘密情報非出力、既存checkの成功を確認。TLS・他OSは未検証。
