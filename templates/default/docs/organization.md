# 組織・部署・ユーザー

Organization / Department / Userは共通Core。業務Featureで複製しない。IDはPrismaが生成するUUID v4で、社員番号・表示名と分離する。

Organization.codeは全体一意、Department.codeとUser.employeeCodeは組織内で一意。社員番号・所属部署は未設定を許可し、Organizationは必須。User.emailは全体一意とし、作成・変更サービスでは小文字へ正規化する（現在のSeedは小文字固定）。同じ部署コード・社員番号は別組織で使用可能。

複合外部キーにより、別組織の親部署・所属部署は拒否する。所属ユーザーや子部署が残る部署、所属が残る組織は削除できない。ユーザー削除時のみAccount・Sessionを連動削除する。通常の退職処理はisActiveで表し、認証での拒否・セッション失効はauthentication/session.tsで実装する。

部署の親変更には`src/organization/department.ts`のmoveDepartmentを使う。自己参照・子孫への移動を拒否し、Serializable transactionで同時変更による循環を防ぐ。競合のP2034時は操作全体を再試行するか呼出側で再操作を案内する。DBのCHECKは自己参照だけを防ぐため、直接SQLやPrisma updateで親を変更しない。既存IDを指定した循環一括作成も行わない。今は管理画面・外部入力の入口を提供しない。認証済みactorIdを引数に渡し、サービス内で認可・監査を実行する。将来の入口ではセッション認証と入力検証を行う。[監査仕様](audit-log.md)を参照。

Better Auth 1.7.6標準のUser / Account / Session / Verificationを定義する。Userには業務属性を追加。認証ではUUID生成を設定し、現時点の作成経路であるSeedが必須organizationIdを供給する。公開サインアップは提供しない。passwordはAccountだけに保存する。

開発SeedはREADMEを参照。予約コードkumuno-demo / head-office / administrationを使用し、既存データは更新しない。作成中の競合はトランザクション全体を戻すため再実行可能。組織・部署が編集済みでも再作成や階層修復はしない。
