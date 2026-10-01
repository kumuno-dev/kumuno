# @kumuno/audit-log

業務変更の成功履歴を共通形式で保存する小さなパッケージ。MIT、Node.js 24.x / ESM。Prisma、Next.js、認証ライブラリへの依存はありません。

現在はnpm未公開です。リポジトリで `npm run build:audit-log` を実行し、`templates/default/vendor/kumuno-audit-log-0.1.0-rc.0.tgz` をコピーして、別アプリで `npm install /absolute/path/kumuno-audit-log-0.1.0-rc.0.tgz` により導入できます。CLIにも同梱します。

```ts
import { appendAuditLog } from "@kumuno/audit-log";
await db.transaction(async tx => {
  const actor = await requireLatestActor(tx, verifiedSession.userId);
  const device = await updateDevice(tx, actor, input);
  await appendAuditLog(entry => insertAuditRow(tx, entry), actor, {
    action: "CREATE", resourceType: "Device", resourceId: device.id,
    after: { name: device.name, status: device.status },
  });
});
```

transaction / requireLatestActor / updateDevice / insertAuditRowは利用アプリが実装する接続例です。認証・認可を済ませ、業務更新と同じtransactionに結びついた保存関数を必ず渡し、appendAuditLogをawaitしてください。内部で別接続・別transactionを開始しません。保存失敗は呼出元へ伝播し、DB transactionが全体を取り消します。パッケージだけで原子性や組織一致を保証するものではありません。

CREATEはafterのみ、UPDATEはbeforeとafter、DELETEはbeforeのみ。スナップショットは許可属性を明示したJSONオブジェクトで、Date・Decimalは利用側で文字列化します。非JSON値・循環・空の操作者/組織/対象を拒否し、writerへ渡す前にコピーします。metadataはversion:1のみ、任意の入力metadata・timestamp等はコピーしません。時刻・IDは保存側で設定します。

アプリごとの安全な属性投影は利用側の責任です。パッケージは属性名から秘密を自動除去しません。パスワード、メール、Cookie、HTTP本文、自由記述などを丸ごと渡さないでください。validateAuditEventは操作と変更前後の有無のみを検査し、属性投影前にも使えます。

保存モデル、SQL NULL / JSON nullの変換、DBの追記専用制約、最新操作者の照合は利用側で実装します。KUMUNOの生成アプリでは、src/audit/log.tsに属性の許可リストとPrisma接続を保持し、SQL NULLをPrisma.DbNullへ変換します。監査閲覧UI・自動DB追跡・外部保管は未実装です。
