# 単段承認の保存例

@kumuno/approval、@kumuno/rbac、@kumuno/audit-logを組み合わせたPostgreSQL接続例。`transaction.mjs`が最新の操作者と申請を取得し、Serializable transaction・旧status/version付きUPDATE・操作履歴・安全な監査を一括確定します。Serializableの競合はCONFLICTへ変換し、利用者に再読込を求めます。expectedVersionには画面が取得した版を渡し、DBから読み直した版で置き換えません。

`verify-database.mjs`のusers/requests/decisions/auditは専用DB内の一時検証テーブルです。アプリのMigrationや別Userマスタの提案ではありません。生成アプリの本物のUserと業務モデルに接続する際は、組織の外部キー・制約・履歴のアクセス制御・監査の追記専用制約をアプリ側で設けます。

```sh
npm run test:approval-package
# TEST_DATABASE_URLに_testで終わる専用DBを指定した環境で実行
npm run test:approval-package:db
```

検証は実tgzを別ディレクトリへ導入し、この接続例をコピーして実行します。専用のランダムschemaを作成・削除し、一般のDB名やDATABASE_URLへのフォールバックは拒否します。申請→差戻し→再申請→承認、最新role/有効状態、自己承認・組織越境の拒否、同時操作の勝者が一人だけになること、監査INSERT失敗時に状態と履歴が戻ることを確認します。

actorIdは必ず認証済みセッションから渡します。直接HTTPへ公開するコードではありません。差戻し理由は業務履歴のみへ保存し、監査は状態と版のみを投影します。自由記述の閲覧範囲、申請の業務内容、承認後の業務更新、初期DRAFT作成は利用アプリで設計します。

申請者と組織の所有は作成後に変更しません。承認対象の内容変更にもversionを増やし、承認中の編集可否を業務側で明示します。編集APIがversionを維持したまま内容を変えると、古い承認画面からの確認を防げません。
