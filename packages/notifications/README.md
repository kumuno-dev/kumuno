# @kumuno/notifications

組織内の有効な受信者に、アプリ内通知の共通形式を渡す。MIT、Node.js 24.x / ESM。DB・Next.js・React・外部配信に依存しない。npm未公開。製品リポジトリの`npm run build:notifications`でvendorへ実tgzを作り、別アプリでnpm installできる。

```ts
import {publishNotification} from "@kumuno/notifications";
await publishNotification(entry => tx.notification.create({data:entry}), actor, recipient, {
  key:"medical-import:unique-event",title:"CSV登録が完了しました",message:"2台を登録しました。",href:"/dashboard/medical-equipment",
});
```

actor/recipientは既存の操作者・組織・有効状態の契約を使い、独立のUser/Organizationモデルを追加しない。同一組織と有効状態、文字数（タイトル160・本文1000・キー200）、dashboard内のリンクを確認する。文字列はプレーンテキストとして表示し、HTMLを評価しない。対象と許可する業務リンクは利用アプリが決める。

writerを業務更新と同じtransactionに結びつける。保存失敗は呼出し元へ返し、握りつぶさない。DBと最新の権限照合、受信者の絞り込み、未読/既読、ページング、冪等キーの一意制約と監査はアプリが所有する。keyは宛先ごとの同じイベントを識別する値で、保存側の一意制約により重複を拒否できる。

今回はCSV取込完了を取込担当者へ1件通知する。メール・プッシュ・定期送信・管理者への一斉通知・過去データへの通知生成は未実装。
