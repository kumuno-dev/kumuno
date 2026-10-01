# 開発ドキュメント

このアプリの仕様・設計・運用の正本はdocs。AGENTS.md / CLAUDE.mdは読込の入口で、独自の仕様を重複して持たない。利用者が今回の依頼で指定した要件と、既存アプリの規約を確認してから変更する。

## 読む順序

| 目的 | 読む文書 |
| --- | --- |
| 起動・コマンド | [README](../README.md) |
| 最初の構成確認 | [architecture.md](architecture.md) |
| 新しい業務機能 | [adding-a-feature.md](adding-a-feature.md)、[coding-conventions.md](coding-conventions.md) |
| データの所有・将来の連携 | [domain-boundaries.md](domain-boundaries.md)、[integration.md](integration.md) |
| モデル・Migration | [database.md](database.md)、[organization.md](organization.md) |
| 認証・権限・監査 | [authentication.md](authentication.md)、[authorization.md](authorization.md)、[audit-log.md](audit-log.md) |
| 医療機器台帳・貸出・返却 | [医療機器台帳](medical-equipment.md) |
| CRUDの具体例 | [equipment.md](equipment.md)、src/equipment |
| 共通画面・管理フォーム | [management.md](management.md) |
| ライセンス | [LICENSE](../LICENSE)、[依存ライブラリの一覧](dependency-licenses.md) |
| 本番へ動かす準備 | [deployment.md](deployment.md) |

実装済み機能と未実装の機能は各文書で区別する。設計を変える場合は関連文書も更新し、実行した検証と残る課題を報告する。


手元の試用は[開発用自動セットアップ](local-development.md)を利用できる。既存DB・本番の設定とは別の開発専用経路。
