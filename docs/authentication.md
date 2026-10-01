# 認証設計

Milestone 5でBetter Auth標準構成によるログイン・ログアウト・DBセッション・保護ページを実装した。仕様と運用手順の正本は[テンプレートの認証規約](../templates/default/docs/authentication.md)。選定の経緯は[0003](decisions/0003-authentication.md)、今回の実装判断は[0011](decisions/0011-authentication-implementation.md)。

共通認可と3ロールはMilestone 6、管理者によるユーザー作成はMilestone 8で実装済み。[認可仕様](authorization.md)と[管理画面仕様](management.md)を参照。外部認証SaaS・AIサービスは組み込まない。
