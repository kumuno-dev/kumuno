# 新しい業務機能を追加する

備品管理を具体的な参照実装として、以下の順序で小さな機能を完了させる。最初に[構成](architecture.md)、[規約](coding-conventions.md)、[Domain境界](domain-boundaries.md)、変更に関係する認証・権限・監査・DB文書を読む。依頼されていない業務機能を一緒に追加しない。

## 1. Domain model

依頼から業務の対象・必須属性・状態・操作を整理する。Shared CoreのOrganization / Department / Userは再利用する。例えば社員研修なら研修受講を新しいDomainのモデルにし、userIdとorganizationIdで既存Userへ関連付ける。研修名・受講日・有効期限・修了状況・備考をUserへ追加しない。

主要Entityの内部IDはUUID v4。社員番号・コード・名称を主キーにしない。組織IDを必須にし、共有マスタへの参照・削除動作・一意性を明示する。同じ組織を強制する複合外部キーはEquipmentを参考にする。担当者の所属と対象リソースの所属が一致する必要があるかは、業務要件として別に決める。

研修の具体的な状態・一意性・権限表は依頼の要件から決める。この例だけを理由にTrainingを先行実装しない。

## 2. Migration

prisma/schema.prismaを編集し、開発DBと専用shadow DBを使って新しいMigrationを作る。手順は[database.md](database.md)。適用済みSQLは変更しない。外部キー・索引・既存データ・CHECK・明示的トランザクションをレビューする。手動SQLで管理する制約やトリガーをschemaだけから再生成して消さない。

```sh
npm run db:migration:create -- --name add_feature
npm run db:migrate
npm run db:generate
```

実行先が開発DBであることを確認する。Prismaがリセットを要求した場合は原因と対象データを確認し、自動承認で既存データを捨てない。

## 3. Validation

src/<feature>/validation.tsへ検証を集約する。必須・文字数・実在する日付・数値・UUID・状態をサーバーで検査する。HTMLのrequired等は入力補助。数値精度が必要な金額は備品のようにDecimalと文字列で扱う。

現在は通常のTypeScript関数を使用している。共通のfield / identifier / InputErrorはsrc/management/validation.tsにある。共通処理だけを再利用し、別業務のparse関数をコピーして複数箇所で保守しない。多数のSchemaや型共有が必要になった場合は、目的と代替案を説明してValidation libraryを選ぶ。

## 4. Authorization

src/authorization/policy.tsに具体的なPermissionを追加し、ロールごとの操作表を文書化する。画面のボタン非表示だけで完了にしない。

HTTP入口でrequireUser / requirePermissionから操作者を取得する。actorIdとorganizationIdはサーバーセッション由来にし、フォームのuserIdやorganizationIdを操作者として採用しない。更新serviceではrequireTransactionActorで最新の有効状態・権限・組織を再確認する。対象のIDを知っているだけでは許可しない。

## 5. Data access

src/<feature>/repository.tsへ読み出しをまとめる。最初からorganizationIdで絞り、他組織のデータを取得後に画面だけで隠さない。詳細も同じ境界を守る。repository自体は認証済みであることを保証しないので、HTTP入口で認可してから呼ぶ。

検索・ページ・並び順はサーバー側で検証し、許可したソートキーだけを使う。同値の並びはIDで安定させる。複雑なSQLはパラメーター化する。

## 6. Business logic

src/<feature>/service.tsに登録・変更・削除と業務ルールを置く。更新用のPrisma操作はこのtransactionの境界内へまとめ、画面・Server Actionへ分散しない。外部キー以外の共有マスタ条件（有効ユーザー等）もここで検査する。

再利用するのはサービスの呼出契約。画面を将来のAPIから呼ぶような設計にはしない。競合時にP2034を受けたら操作全体の再試行または再操作案内を行う。実行済みの一部更新だけを繰り返さない。

## 7. UI

src/app/dashboard/<feature>へ画面、src/<feature>/actions.tsへServer Actionを置く。src/management/form.tsxのManagementFormと共通dashboard layoutを利用できる。新しいメニューも権限に合わせて表示する。

各Server Actionは未信頼のPOST入口として、セッション・Origin・入力・権限を確認する。現在はBETTER_AUTH_URLとOriginの一致も検査する。権限不足の案内とHTTP 403応答は同じものではない。APIを追加する場合はForbiddenErrorを明示的な403へ変換する。

未知の例外は固定の利用者向けメッセージと安全なコードへ分ける。DB生エラー・パスワード・トークン・入力全体をログに出さない。Next.jsのredirect / notFoundは制御例外なので、成功時のredirectは通常のエラー捕捉の外で実行する。APIの使い方はインストール版のnode_modules/next/dist/docsを確認する。

## 8. Audit

公開するすべての業務更新にCREATE / UPDATE / DELETEの成功履歴を付ける。業務更新とappendAuditLogを同じtransactionで確定し、監査INSERT失敗時は業務更新も戻す。

現行のsrc/audit/log.tsはUser / Department / Equipmentの許可属性を明示している。新しいresourceTypeは、その業務に必要な安全なスナップショット型とprojectionを明示的に追加する。資格情報・Cookie・リクエスト本文・自由記述の備考を丸ごとコピーしない。新しい分岐はsnapshot保存のみにし、個別Domainのserviceやrepositoryを監査モジュールへimportしない。

## 9. Tests

入力検証・権限の単体テスト、実PostgreSQLの組織境界・関連制約・更新と監査の原子性、ブラウザーの主要操作を変更に合わせて追加する。実DBをモックだけで置き換えない。

```sh
npm run check
npm run test:db
npm run test:auth
```

checkは本番ビルドと基本ブラウザーテストも含む。test:db / test:authには専用_test DBが必要。現在test:authは認証に加え、管理画面・備品CRUDを3画面幅で確認する。新機能の主要操作も適切なブラウザー検証へ追加する。TEST_DATABASE_URL未設定時に成功扱いで省略しない。

価格の精度・無効ユーザー・組織越境・権限降格後の古いフォーム・競合・監査保存失敗を必要に応じて確認する。確認できなかった環境や操作も記録する。

## 10. Documentation

docs/<feature>.mdへモデル、権限表、操作、削除動作、監査属性、検証、残る制限を記録する。docs/README.mdとarchitecture.mdから辿れるようにし、必要に応じてREADME・共通の認可／監査文書を更新する。

最後に、同じ機能を別のAI coding agentが読んでも理解できるかを確認する。今回の会話履歴やKUMUNO製品開発用リポジトリを持たなくても、生成アプリ内の文書とコードだけで保守できる状態を完成条件にする。
