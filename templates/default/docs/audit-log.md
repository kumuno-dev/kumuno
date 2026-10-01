# 監査ログ

AuditLogは操作の成功履歴。id / organizationId / userId / action / resourceType / resourceId / timestamp / metadata / before / afterを保存する。actionはCREATE / UPDATE / DELETE。時刻はDBで設定するUTCのtimestamptz、IDはUUID。組織・時刻と対象リソースに索引を設ける。

## 更新処理への組み込み

部署移動moveDepartment、ユーザー無効化disableUser、管理画面の登録・編集・部署削除は、認証済みセッション由来のactorIdを必須とする。呼出元でrequireUser等により認証し、本文のuserIdを操作者として渡さない。サービス内で最新の操作者をDBから取得し、有効状態・権限・対象組織を確認する。

同一のSerializable transactionで業務更新・必要なセッション削除・appendAuditLogを実行する。監査保存が失敗すれば全体がロールバックする。権限不足・循環エラーなど失敗操作は成功履歴に残さない。同じ親部署への移動・既に無効なユーザーの再無効化はログを追加しない。競合時のP2034は呼出側で操作全体を再試行するか、再操作を案内する。

```ts
const actor = await requireUser();
await disableUser(db, actor.id, targetUserId);
// または await moveDepartment(db, actor.id, actor.organizationId, departmentId, parentId);
```

新しい業務更新では同一トランザクション内でappendAuditLog(tx, actor, event)を呼ぶ。これは内部ヘルパーで、認証・認可の代わりではない。CREATEはafter、UPDATEはbeforeとafter、DELETEはbeforeを必須にする。User・Department・Equipmentをサポートする。備品の自由記述の備考は記録しない。

## 記録対象と秘匿

Userの変更前後はisActive / role / departmentIdだけ。Departmentはcode / name / parentIdだけ。オブジェクト全体をJSON化せず、許可した属性へ明示的に絞る。Userのメール・氏名、Account、Session、パスワード、Cookie、トークン、HTTP本文は保存しない。metadataは現在version: 1のみ。自由入力のmetadataは公開しない。

操作者はUUIDを履歴として保持し、User削除に連動してログを消さない。そのためuserIdの外部キーは設けない。組織は外部キーで参照し、履歴がある組織の削除は拒否する。認証内部のSession / Account更新、開発Seed、DB管理者による直接SQLは業務監査対象外。これらを含む全DB変更の追跡を保証する仕組みではない。

## 変更禁止と運用

公開のログ書込・編集・削除APIは提供しない。PostgreSQLのトリガーでUPDATE / DELETE / TRUNCATEを拒否する。DB所有者・スーパーユーザーがトリガーを無効化する行為まで防ぐものではない。本番ではMigration用所有者とアプリ接続ロールを分離し、後者にDDL・トリガー無効化権限を付けない。専用運用ロールの構築・検証は今後の運用工程。

ログの閲覧画面・HTTP API・保存期限による削除・外部保管は未実装。将来の閲覧ではサーバー側の権限判定とorganizationIdによる絞り込みが必要。既存DBは新しいMigrationをdb:migrateで適用する。過去の操作履歴は遡及作成しない。

## 検証

npm run test:unitで秘匿属性の除外と変更前後の整合性、npm run test:dbで更新との同時保存・認可境界・監査INSERT失敗時の全体ロールバック・履歴の改変拒否・操作者削除後の保持を確認する。test:template:dbではCLI生成物でも確認する。

医療機器台帳のMedicalDeviceも登録・編集と同一トランザクションで監査を保存する。管理番号・メーカー・型式等の明示的な台帳属性を投影し、備考は監査へ保存しない。[台帳仕様](medical-equipment.md)を参照。

貸出MedicalLoanのCREATE、返却時のMedicalLoanとMedicalDeviceのUPDATEも業務更新と同じトランザクションで記録する。貸出場所等の自由入力を監査へ保存しない。

MedicalInspectionのCREATEとMedicalDeviceのUPDATEも点検・再貸出許可と同時に保存する。点検内容の自由入力を監査へ保存しない。

MedicalRepairのCREATE/UPDATEも業務操作と同時に保存する。修理依頼時はMedicalDeviceの停止もUPDATE監査を保存する。機器・依頼者・状態・日時のみを投影し、不具合・修理内容を監査へ保存しない。
