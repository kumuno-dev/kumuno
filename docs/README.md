# KUMUNOのドキュメント

このdocsはKUMUNO本体の仕様・設計判断の正本です。生成アプリにも独立したdocsを同梱します。本体の公開工程と、生成アプリの業務仕様を混同しないでください。

## 目的から選ぶ

| 目的 | 文書 |
| --- | --- |
| KUMUNOを試す | [本体README](../README.md)、[生成アプリREADME](../templates/default/README.md)、[CLI](../packages/create-kumuno/README.md) |
| 本体の開発・テスト | [開発ガイド](development.md)、[貢献方法](../CONTRIBUTING.md)、[エージェント向け入口](../AGENTS.md) |
| v0.1の目標と実装状況 | [マスター仕様書v3.1](master-spec.md)、[現在の構成・工程](architecture.md)、[変更履歴](../CHANGELOG.md) |
| AIと業務機能を追加 | [生成アプリの文書一覧](../templates/default/docs/README.md)、[機能追加手順](../templates/default/docs/adding-a-feature.md) |
| 共通基盤 | [DB](database.md)、[認証](authentication.md)、[認可](authorization.md)、[監査](audit-log.md) |
| 参照する業務機能 | [管理画面](management.md)、[備品管理](equipment.md) |
| データの所有と将来の接続 | [Domain境界](domain-boundaries.md)、[連携方針](integration.md) |
| v0.1の受入 | [Acceptance Test A〜G](acceptance/v0.1.md)、[研修追加の再現](../examples/training-acceptance/README.md) |
| 配布・ライセンス | [公開手順](releasing.md)、[依存ライセンス](dependency-licenses.md)、[MIT](../LICENSE) |
| 運用とセキュリティ | [生成アプリの運用前提](../templates/default/docs/deployment.md)、[セキュリティ方針](../SECURITY.md) |

マスター仕様書は目標を含みます。今使える機能・検証結果・未確認事項はREADMEとarchitecture.mdで確認してください。

## 設計判断

[初期技術設計](design/milestone-0.md)とdocs/decisionsの記録に、選定理由と当時の検証範囲を残します。過去の未実装記述は当時の状態です。現在の操作手順はREADMEとdevelopment.mdを使ってください。

主な記録: [Prisma](decisions/0002-postgresql-foundation.md)、[Better Auth](decisions/0011-authentication-implementation.md)、[備品参照実装](decisions/0015-equipment-reference.md)、[AI文書](decisions/0016-ai-documentation.md)、[同梱CLI](decisions/0017-cli-bundled-template.md)、[配布物検証・CI](decisions/0018-packed-cli-integration-ci.md)。
