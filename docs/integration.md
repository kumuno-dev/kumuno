# 将来の連携方針

第3版のIntegration-ready原則を扱う。v0.1では単一アプリで共通マスタを共有し、将来の連携を妨げない境界を作る。外部連携基盤そのものは実装しない。

## 部署間の共有

人事がUser / Departmentを管理し、総務のEquipmentと将来のTrainingが同じ内部IDを参照する。部署ごとのユーザーマスタは作らない。各部署固有データはそれぞれのDomainが所有する。

これは単一アプリ内の共有を想定した設計であり、別々のDBを持つシステム間の同期が既にできることを意味しない。将来分離する場合は、マスタの管理主体・ID対応・同期方法・認可・障害時の扱いを別途設計する。

## 連携の入口

当面は責務を持つservice functionとdata-access境界を使う。将来APIが必要になった場合は認証・認可・Validation・バージョン方針・エラー形式・監査を設計する。全CRUDを公開APIにすることはv0.1の要件ではない。

CSV / Excel / JSON / APIによる将来のデータ移行を妨げない。初期v0.1の受入範囲にはCSV・Excel機能を含めない。追加の組合せ型構成としてCSV形式の読込検証と医療台帳の[CSV出力](../templates/default/docs/csv.md)を実装した。医療台帳の確認付き新規一括登録を追加、xlsxは後続。マイクロサービス、Message Broker、Event Bus、汎用Integration Frameworkも対象外。

## Acceptance Test F / G（未実施）

Equipment完成後、仮想のTraining追加について以下を設計レビューする。

- User / Departmentを再定義せず既存マスタを参照できる。
- TrainingはEquipmentの内部実装へ依存しない。
- Training固有データがShared Coreへ混入しない。
- 業務処理をUIから分離し、将来APIから利用する境界を説明できる。
- 既存機能を壊さずDomainを追加できる。
- 人事・総務・教育担当が共通マスタを利用するシナリオと責任分担を説明できる。

問題があればv0.1公開前に設計を見直す。F / Gは設計レビューであり、Trainingを標準テンプレートの必須機能へ追加する指示ではない。一方、Acceptance Test DのAIによる研修管理追加は、生成した検証用プロジェクトで行う受け入れ試験として維持する。
