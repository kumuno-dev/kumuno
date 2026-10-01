# @kumuno/rbac

KUMUNOのADMIN / MANAGER / USERと組織境界の権限判定。MIT。Next.js、Prisma、Better Authへの依存はありません。Node.js 24.x / ESM。

現在は未公開です。リポジトリで `npm run build:rbac` を実行し、生成された `templates/default/vendor/kumuno-rbac-0.1.0-rc.0.tgz` を既存アプリへ `npm install /absolute/path/kumuno-rbac-0.1.0-rc.0.tgz` で導入できます。

```ts
import { createRbacPolicy, type RbacPolicy, type Permission } from "@kumuno/rbac";
type AppPermission = Permission | "devices:read" | "devices:manage";
const policy: RbacPolicy<AppPermission> = createRbacPolicy({
  ADMIN: ["devices:read", "devices:manage"],
  MANAGER: ["devices:read", "devices:manage"],
  USER: ["devices:read"],
});
policy.assertPermission(actor, "devices:manage", { organizationId: device.organizationId });
```

基本権限はAdminが全6操作、Managerがdashboard/users/departmentsのread、Userがdashboard:read。`can` と `assertPermission` の直接exportは基本権限だけを判定します。業務固有の権限はfactoryへの明示的な追加で割り当てます。Adminにも未知の操作を許可しません。追加は基本権限を削除せず、入力配列をコピーします。

未認証、無効ユーザー、空の組織、別組織、未知ロール・操作を拒否します。assertPermissionはForbiddenError（status:403）を投げ、成功時にPrincipalへ型を絞ります。HTTP応答の設定は利用側の責任です。

このパッケージはDBを照会しません。サーバーで検証したセッションから操作者IDを得て、DBから最新のrole/isActive/organizationIdを読み、対象の実際の組織を渡してください。更新時は同じtransaction内で再判定し、更新と監査を一括確定します。フォームのroleやorganizationId、古いセッションのroleを信用しないでください。部署別・本人限定のスコープは未実装です。
