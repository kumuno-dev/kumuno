# コーディング規約

[構成](architecture.md)と[機能追加手順](adding-a-feature.md)を先に読む。通常のNext.js / TypeScript / Prismaとして理解できる、小さく具体的な実装を保つ。

## 配置と責務

- src/app: URLと画面。Server Componentで認可済みの読み出しを行う。Client Componentへ秘密やPrismaオブジェクト全体を渡さない。
- src/<feature>: validation / repository / service / actions / 固有フォーム。現在の業務例はsrc/equipment、共有マスタ管理はsrc/management。
- src/database / authentication / authorization / audit / organization: 共通基盤。認可・セッション失効・監査の仕組みをFeatureごとに作り直さない。
- prisma/migrations: 適用するSQLの正本。src/generated/prismaは生成物なので編集しない。

読み出しrepositoryと更新serviceを分ける。更新service内のPrisma操作は、認可と監査を含むtransaction境界を明確にするためその場に置く。すべてのCRUDを汎用Repositoryや巨大な抽象クラスへ隠さない。

巨大なutils.ts / helpers.ts / actions.tsを作らない。React Component内の複雑な業務ロジック、Role比較の散在、DB更新の散在、Validationのコピー、Feature間の循環依存、別Domainの内部repositoryへの無制限な依存を避ける。

## TypeScript・データ

strict型検査を通す。外部入力はunknownまたはFormDataとして受け、検証後に型を絞る。anyや未検証の型アサーションで入力エラーを隠さない。現在の状態enumへのアサーションは、許可値検査後に限る。

UUIDの内部IDと社員番号・部署コード・表示名を分ける。メールは保存時に小文字へ正規化。金額はDecimal、日付は用途に合うDATE／timestampを使う。Clientへ送る必要があればDecimal・Dateを明示的な表示値へ変換する。

## 認証・認可・更新

DB専用入口はdatabase/clientのgetDatabase。Client Componentからはserver-onlyで拒否される。共通serviceはDBテストで直接使えるが、HTTPへ公開するときは必ず認証入口を通す。

Permissionを中心に判定する。組織IDと操作者はセッションから取得し、対象検索にも組織を指定する。更新transaction内で最新の操作者を確認する。Cookie中の古いroleや画面表示だけを信頼しない。

業務更新と監査は一括確定する。対象ID・action・変更前後を記録し、監査失敗を握りつぶさない。監査用JSONへ丸ごとのモデルやHTTP本文を渡さない。

## 画面・エラー

日本語の入力ラベル、キーボード操作、focus表示、送信中の無効化、失敗時の案内を維持する。ラベルと補足説明を分け、説明はaria-describedbyで関連付ける。スマートフォン・タブレットで横にはみ出さないことを確認する。

予測可能な入力・権限エラーは利用者向けの文言へ変換する。未知の例外は固定メッセージと診断コードだけを出す。redirect / notFoundはNext.jsの制御例外として扱う。資格情報・接続URL・DB生エラーをconsoleや返却値へ出さない。

## 保守

新規dependencyには目的・必要性・代替・保守・ライセンスを記録する。既存の仕組みで満たせる小さな変更にライブラリを足さない。適用済みMigrationを書き換えず、モデル変更には新しいMigrationと実DBテストを付ける。

設計・コード・関連docsを同じ変更で整合させ、[READMEの検証](../README.md)を実行する。成功した検証と未確認事項を区別し、実行していないものを成功扱いにしない。
