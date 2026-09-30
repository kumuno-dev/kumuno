# 備品管理 — Business Featureの参照実装

/dashboard/equipmentに一覧・検索・ページ切替・並び替え、newに登録、UUIDの詳細ページに参照・編集・削除を提供する。備品はOrganization / Department / Userを参照し、独自の人物・部署マスタは作らない。

## 構成

| ファイル | 責務 |
| --- | --- |
| prisma/schema.prisma / migrations | Equipment、状態enum、組織をまたがない複合外部キー |
| src/equipment/validation.ts | FormData・検索条件のサーバー検証 |
| src/equipment/repository.ts | 組織を絞った詳細取得、一覧検索・件数・ページ |
| src/equipment/service.ts | 最新権限検査、共有マスタ検証、更新と監査の同時保存 |
| src/equipment/actions.ts | セッション認証、Origin検査、エラー案内、再検証と遷移 |
| src/equipment/form.tsx / src/app/dashboard/equipment | フォームと画面 |

新しいFeatureではこの順序を参照し、共有認証・認可・監査を再利用する。UIから直接更新SQLを実行しない。repositoryは内部のデータアクセス層で、認証・認可を代替しない。HTTP入口は必ずセッションからOrganizationと操作者を取得する。

## データと入力

名前120文字・カテゴリ80文字は必須。購入日は任意の実在するYYYY-MM-DDをDATEに保存する。購入価格は任意・0以上・整数12桁、小数2桁まで。通貨はこの参照実装では円。Decimal(14,2)と文字列で扱い、浮動小数で計算しない。部署・担当者は任意で同じ組織のものに限定し、担当者の割当時は有効ユーザーを要求する。担当者の所属部署と備品の部署が同じであることは要求しない。状態はIN_USE / STORAGE / REPAIR / DISPOSED。備考は任意2000文字まで。

担当者の後日無効化では備品との参照を保持する。再編集時は担当者を有効なユーザーへ変更するか未設定にする。割当のある部署・Userの物理削除はDBのRestrictで拒否する。備品の削除は確認チェック後に物理削除し、監査の対象IDと変更前を保持する。

## 一覧・権限

全ロールにequipment:read、AdminとManagerにequipment:manageを付与する。Userは一覧・詳細だけ。組織外の備品は一覧に出ず、詳細は404、変更は拒否する。組織内のデータスコープのみで、部署単位の制限は未実装。

検索は備品名・カテゴリの大文字小文字を区別しない部分一致。1ページ10件。名前順・新しい順・価格が高い順を許可し、IDを第2ソートキーにして同値の順序を固定する。価格未設定は最後。検索・並び順をページリンクへ引き継ぎ、条件変更時は1ページ目へ戻す。範囲外ページは最終ページに丸める。件数と行をRepeatableRead transactionで取得する。

監査はCREATE / UPDATE / DELETEを業務更新と同じSerializable transactionに含める。名前・カテゴリ・購入日・価格・所属ID・担当者ID・状態を明示的に記録し、自由記述の備考は監査へコピーしない。監査失敗時は業務更新も取り消す。競合時は再読込・再操作を案内する。編集開始後の別ユーザー変更を画面のバージョンで検出する楽観ロックは未実装。

## 検証

test:unitで価格・日付・状態と一覧パラメーター、test:dbでCRUD・正確な価格・組織制約・権限・一覧操作・監査失敗時の原子性を確認する。test:template:dbでは生成物のPC・タブレット・スマートフォンでCRUD・検索・ページ切替・並び替え・Userの更新拒否も検証する。

既存DBにはdb:migrateで新しいMigrationを適用する。Migrationに既存マスタのデータ変更は含まない。大量データの性能・本番プロキシ・実TLS・他OSは未検証。
