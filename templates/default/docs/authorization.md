# Authorization / RBAC

User.roleにADMIN / MANAGER / USERを保存する。認証はBetter Authの標準構成を維持し、業務認可はsrc/authorizationに集約する。ロール文字列の比較を画面や各Featureに散在させない。

| 操作 | Admin | Manager | User |
| --- | --- | --- | --- |
| dashboard:read | 許可 | 許可 | 許可 |
| users:read / departments:read | 許可 | 許可 | 拒否 |
| users:manage / departments:manage | 許可 | 拒否 | 拒否 |
| roles:assign | 許可 | 拒否 | 拒否 |

この表はv0.1の基盤方針。管理画面のServer ActionでAdminがロール変更できる。自分自身の変更は拒否する。Managerは共有マスタの参照のみとし、更新・昇格を認めない。Adminも別組織への権限を持たない。

## サーバーでの使用

Server Component / Server ActionではrequirePermissionを使う。未認証は/loginへ移動する。権限不足はForbiddenError（status: 403）を投げる。今後のHTTP APIではこのエラーだけを403レスポンスへ変換し、未知の例外は500として扱う。エラーのstatusプロパティだけでNext.jsのHTTPステータスが自動設定されるわけではない。

```ts
const actor = await requirePermission("users:read");
// データ取得でも必ず組織を絞る。画面上の非表示だけでは保護にならない。
const users = await db.user.findMany({ where: { organizationId: actor.organizationId } });
```

既存リソースの操作には、DBから取得した対象のorganizationIdをassertPermission(actor, permission, scope)へ渡す。リクエスト本文の組織IDやroleを認可情報として信用しない。canは表示制御にも使えるが、書込の直前にサーバー側で再判定する。disableUser / moveDepartmentはactorIdを受け取り、トランザクション内で最新権限・対象組織を検査して監査を保存する。HTTPの入口では必ずセッション認証を行い、そのactorIdを渡す。

getActiveUserは毎回DBから最新のroleとisActiveを読み、セッション内の古いroleを使用しない。未認証・無効ユーザー・未知ロール・未知操作は拒否する。認可確認後に別トランザクションで変更された権限まで遡及して取り消すものではない。重要な書込は今後の各業務サービスでトランザクション内の確認を設計する。

v0.1のスコープはORGANIZATION。対象コンテキストをロールと分離し、将来OWN / DEPARTMENT / SUBTREEを追加できる。これらの細分化スコープは未実装。

## Migration / Seed

新しいMigrationをdb:migrateで適用する。既存ユーザーは全員USERになり、メールアドレスから自動的にAdminへ昇格させない。新規作成時も既定値はUSER。開発Seedで初めて作成する管理者のみADMIN。Seed再実行は変更済みのロールを保持する。

以前のSeedユーザーを使う場合もUSERのままログイン・ダッシュボードを利用できる。既存ユーザーへの管理者付与は、運用者が対象のID・所属を確認してDB管理手順で明示的に行う。自己昇格APIや公開サインアップは提供しない。本番の初期管理者プロビジョニングは未実装。

npm run test:unitで許可表と拒否条件、npm run test:dbで既定値・降格の即時反映・Seed再実行・クライアント入力による昇格拒否を検証する。

備品は全ロールにequipment:read、AdminとManagerにequipment:manageを付与する。[備品仕様](equipment.md)を参照。
