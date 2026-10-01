# Database

アプリのDB構成・設定・Migration・復旧・検証の正本は[テンプレートのDB規約](../templates/default/docs/database.md)です。rootのDBコマンドもtemplates/defaultを作業ディレクトリとして実行します。環境ファイルは同ディレクトリに配置してください。

採用判断は[Prisma選定記録](decisions/0002-postgresql-foundation.md)を参照してください。Prisma基盤、共有マスタ、認証テーブル、監査ログ、備品モデルを実装済みです。
