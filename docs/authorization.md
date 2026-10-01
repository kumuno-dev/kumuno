# Authorization / RBAC

生成アプリの[認可仕様](../templates/default/docs/authorization.md)と[設計判断](decisions/0012-authorization.md)を参照。

共通判定は[@kumuno/rbac](../packages/rbac/README.md)へ抽出済み。アプリ側で業務権限を追加し、最新操作者のDB照合を維持する。[抽出の設計判断](decisions/0030-rbac-package.md)を参照。
