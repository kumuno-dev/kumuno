# @kumuno/auth

Better Authを薄くラップするKUMUNOの認証パッケージ。Node.js 24、Better Auth 1.7.6。MIT。現在は未公開のRC候補。npm Registryからのinstallは公開後に利用できる。

公開前は、KUMUNOリポジトリで `npm run build:auth` を実行し、生成されたtgzを既存アプリへインストールする。

```sh
npm install ./kumuno-auth-0.1.0-rc.0.tgz better-auth@1.7.6
```

```ts
import {createKumunoAuthentication,getAuthConfig,handleAuthentication} from "@kumuno/auth";
import {prismaAdapter} from "better-auth/adapters/prisma";

const config = getAuthConfig();
const auth = createKumunoAuthentication({
  config,
  database: prismaAdapter(prisma, {provider:"postgresql"}),
  findUserAccess: userId => prisma.user.findUnique({
    where:{id:userId},select:{isActive:true},
  }),
});
// Framework-specific route: pass Request and return Response.
const response = await handleAuthentication(request,auth,config);
// Protected server code may use auth.api.getSession; keep tokens on the server.
```

利用側がPrisma等のadapterと、DBから最新のユーザー有効状態を取得する関数を渡す。呼び出し側は認証情報のない状態で業務処理を許可してはならない。実際のDB構築・Migration・初期管理者作成が必要で、installだけでログイン可能にはならない。

必要なモデルはBetter Auth標準User/Account/Session/VerificationとDB試行制限RateLimit。UserにはorganizationIdとisActiveを追加し、organizationIdはセッション由来のユーザーを業務マスタへ照合する。無効化時のセッション削除・最新のロール/組織確認は利用側が実装する。DB schema、Migration、Prisma生成Client、Next.js画面、RBAC、監査、業務Domainは同梱しない。

標準の署名Cookie・credential Account・DBセッション・DB試行制限を利用する。公開HTTP入口はログイン/ログアウトのPOSTのみ。固定Origin、信頼済みプロキシIP、HTTP応答の秘匿は維持する。getAuthConfigはHTTPS origin（ループバックのみHTTP）と32文字以上の秘密鍵を要求する。秘密値をログへ出力しない。

対応するadapterでorganizationId/isActiveを含むschemaとRateLimitを準備する必要がある。Prisma以外のadapterは今回の実DB検証対象外。[Better Auth公式adapter説明](https://better-auth.com/docs/adapters/prisma)と[DB hook説明](https://better-auth.com/docs/concepts/database)を参照。
