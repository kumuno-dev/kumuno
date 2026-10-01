# @kumuno/approval

単段の申請・承認・理由付き差戻しの状態遷移。MIT、Node.js 24.x / ESM。DB・フレームワークへの依存はありません。

npm未公開です。リポジトリで `npm run build:approval` を実行し、`templates/default/vendor/kumuno-approval-0.1.0-rc.0.tgz` をコピーして `npm install /absolute/path/kumuno-approval-0.1.0-rc.0.tgz` で導入できます。ソース版CLIにも同梱しますが、承認画面やDBモデルは追加しません。

```ts
import { transitionApproval } from "@kumuno/approval";
import { createRbacPolicy } from "@kumuno/rbac";
const policy = createRbacPolicy({
  ADMIN: ["approval:submit", "approval:review"],
  MANAGER: ["approval:submit", "approval:review"],
  USER: ["approval:submit"],
});
const transition = transitionApproval({ request, actor, can: policy.can,
  command: { action: "RETURN", expectedVersion: input.expectedVersion, reason: "内容を確認してください" },
});
```

input.expectedVersionは画面が読んだ版をサーバーで検証した値です。最新request.versionで置き換えると古いフォームを検知できません。

request / actorは利用側が同じ更新transaction内でDBから取得する最新情報です。認証済みセッションのactor IDを使い、フォームのrole/organizationIdを信用しません。requestにはid / organizationId / requestedById / status / versionを渡します。初期DRAFTの作成・認可・業務内容の検証は利用側の責任です。

| 現在 | 操作 | 次 | 操作者 |
| --- | --- | --- | --- |
| DRAFT / RETURNED | SUBMIT | PENDING | 申請者本人 |
| PENDING | APPROVE | APPROVED | 申請者以外の権限を持つ担当者 |
| PENDING | RETURN（理由必須） | RETURNED | 申請者以外の権限を持つ担当者 |

組織越境・無効ユーザー・自己承認/自己差戻し・他人の申請/再申請はAdminも拒否します。canは明示的な同期の権限判定を必須とし、trueだけを許可します。上のロール割当は導入例で、個別の担当者割当・部署制限が必要なら利用側で絞ります。APPROVEDは終端。取消・却下・代理申請・多段承認は未実装です。

expectedVersionが最新versionと違う場合はCONFLICT。成功時は新しいrequest、action、actorId、reason（RETURNのみ、trim後1〜1000文字）を返し、元オブジェクトを変更しません。ApprovalErrorはcodeとstatusを持ちますが、HTTP応答への変換は利用側の責任です。

状態遷移だけでは同時保存を防げません。保存時もID・組織・旧status・旧versionを条件にUPDATEし、更新件数1を確認します。同じtransactionで業務側の結果、操作履歴、@kumuno/audit-logの安全な監査を保存し、失敗は全て戻します。自由記述の差戻し理由は業務履歴側で管理し、監査には丸ごと保存しません。ID・時刻・DB制約・履歴保持は利用側が実装します。

リポジトリのexamples/approvalにはPostgreSQLの接続例と専用DB検証があります。保存や監査の原子性はこの接続例の責任で、パッケージ自体がtransactionを開始することはありません。
