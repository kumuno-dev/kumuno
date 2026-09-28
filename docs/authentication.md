# 認証設計

Milestone 5でBetter Auth標準構成によるログイン・ログアウト・DBセッション・保護ページを実装した。仕様と運用手順の正本は[テンプレートの認証規約](../templates/default/docs/authentication.md)。選定の経緯は[0003](decisions/0003-authentication.md)、今回の実装判断は[0011](decisions/0011-authentication-implementation.md)。

認証と認可は別の工程。管理者によるユーザー作成・RBACは後続工程で実装する。今回、新しい認証ライブラリ・外部認証SaaS・AIサービスは追加していない。
