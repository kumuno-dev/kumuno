# Domain境界

第3版の第7.6〜7.12節・第29章を具体化する設計規約。業務モデルの実装はまだない。配置とID方式の最終選定はMilestone 0で比較・提案する。

## 共通部分と業務固有部分

Shared Coreは認証・User・Organization・Department・認可・監査を所有する。EquipmentなどのBusiness Domainは既存のUser / Department / Organizationを参照し、独自の人物・部署マスタを作らない。

業務固有の属性・状態・ルールは、そのDomainが所有する。将来のTrainingの受講状況や資格の有効期限をUserへ直接追加しない。Domain側のデータを安定したUser.idで関連付ける。

## 依存の方向

- Business DomainからShared Coreの必要な公開機能を利用する。
- Shared CoreはEquipmentなど個別業務へ依存しない。
- Domain間の循環依存を禁止する。他Domainの内部repositoryやテーブル構造へ無制限に依存しない。
- 同一アプリ内の単純な外部キーは許可する。外部キーの存在だけを理由にAPIやイベント基盤を追加しない。
- 連携が必要になった時点で、提供側のservice functionなど責務が明確な入口を設ける。まだ使わない抽象層は作らない。

React Component・Server Action・Route Handlerには表示や入力の受け渡しを置き、再利用する業務処理はserviceへ分ける。Prisma操作はdata-access / repositoryへまとめる。認可と監査がUI以外の入口でも抜けないよう、業務操作の呼び出し契約とテストに含める。

## IDとデータ所有

主要Entityは安定した内部IDを持ち、社員番号・部署コード・表示名と分離する。UUID・ULID・DB採番は未決定であり、Milestone 0で比較する。ID方式が未決定のまま業務テーブルを追加しない。

部署固有データは所属Domainへ置く。共有マスタの変更・参照に必要な認可、削除時の外部キー動作はモデルを実装する工程で明示する。IDを知っているだけでアクセスを許可しない。

## レビュー

Equipment完成後、Trainingを追加する設計で、共有マスタの再利用、Equipmentへの不要な依存の不在、Coreへの業務属性混入の不在を確認する。受け入れ条件は[integration.md](integration.md)を参照する。
