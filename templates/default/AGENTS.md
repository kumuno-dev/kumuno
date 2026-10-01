# Application guide

このアプリ内のdocsを仕様の正本とする。最初に[README](README.md)と[文書一覧](docs/README.md)、[構成](docs/architecture.md)を読む。

新機能は[追加手順](docs/adding-a-feature.md)、[規約](docs/coding-conventions.md)、[Domain境界](docs/domain-boundaries.md)、[連携方針](docs/integration.md)を確認し、src/equipmentと[備品仕様](docs/equipment.md)を参照する。

- DB・共有マスタ・認証・認可・監査の変更では対応するdocsを先に読む。
- セッション由来の操作者・組織を使い、更新と監査を同じtransactionで保存する。
- 依頼された機能を小さく完了し、実装・関連docs・READMEの検証を揃える。
- フレームワークAPIは採用版node_modules/next/dist/docsを確認する。
- 実行した検証と未確認事項を報告し、未実装の機能を利用可能とは案内しない。

起動・運用は[deployment.md](docs/deployment.md)。このファイルへ詳細仕様を重複させない。
