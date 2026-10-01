# アプリの構成

Next.js・Prisma・PostgreSQL基盤、共有マスタ（Organization・Department・User）、開発Seedを実装済み。Better Authによるログイン・ログアウト・保護ページを実装済み。3ロールの共通認可を実装済み。共通画面とユーザー・部署管理、備品管理を実装済み。

- src/app: App Router、画面とレイアウト
- src/database: 接続設定、サーバー専用入口、Migration CLI補助
- prisma: モデルとSQL Migration
- scripts: DB接続確認・適用コマンド
- tests: 実PostgreSQL結合テストとブラウザーテスト
- docs: このアプリの設計・運用規約

依存とlockfileはこのディレクトリ内で完結する。親リポジトリやKUMUNO独自ランタイムを必要としない。Prisma Clientはnpm ciで生成する。

DB操作はサーバー側のdatabase/client経由で行う。業務機能を追加する際はFeature単位に整理し、UIへ複雑な業務ロジック・DBアクセス・認可判定を散在させない。User / Organization / Departmentの共通概念は重複定義しない。

仕様・判断はdocsに記録する。Better Auth 1.7.6の標準認証モデルとSeed用ハッシュ処理を導入済みで、ハッシュはAccountへ保存しUserへ重複保存しない。未導入機能を実装済みと扱わない。

共有マスタの制約と部署移動は[organization.md](organization.md)を参照。

認証はsrc/authenticationへ集約する。運用とテストは[authentication.md](authentication.md)を参照。

認可はsrc/authorizationへ集約する。[authorization.md](authorization.md)を参照。

業務更新の監査はsrc/auditへ集約する。[audit-log.md](audit-log.md)を参照。

管理画面はsrc/app/dashboard、更新と入力検証はsrc/management。[management.md](management.md)を参照。

備品管理はsrc/equipmentに入力・読み出し・更新・HTTP入口を分離する。[equipment.md](equipment.md)を参照。


## 開発の入口とFeature配置

[文書一覧](README.md)、[機能追加手順](adding-a-feature.md)、[コーディング規約](coding-conventions.md)を開発の入口とする。[Domain境界](domain-boundaries.md)と[連携方針](integration.md)を保ち、Shared Coreへ業務属性を混入させない。

現在の配置はsrc/equipmentのようにsrc直下のFeatureディレクトリ。新機能もsrc/<feature>にvalidation / repository / service / actions / 固有フォームを置き、URLに対応する画面をsrc/app/dashboard/<feature>へ置く。既存構成を作り直す独自ランタイムや、未使用の抽象層は加えない。

データの流れは認証済みHTTP入口→入力検証→serviceの最新認可→DB更新と監査の一括確定→画面再検証。読み出しは認可済みページ→組織を指定したrepository→表示用データ。備品のserviceでは更新Prisma操作をtransaction内に置き、repositoryは読出しに責任を持つ。

現在の共通FormData補助はsrc/management/validation.ts、共通フォームはsrc/management/form.tsx。大きな汎用層にする前に、再利用する責務だけを選ぶ。[デプロイ](deployment.md)には運用前提と未確認の範囲を記録する。


手元の試用は[開発用自動セットアップ](local-development.md)を利用できる。既存DB・本番の設定とは別の開発専用経路。

医療機器台帳はsrc/medical-equipmentとMedicalDeviceモデルで管理する。共通マスタを再利用し、一般備品とは異なる医療固有の属性を所有する。[台帳仕様](medical-equipment.md)を参照。

医療機器の貸出・返却はMedicalLoanとsrc/medical-equipment/loans.tsで管理する。台帳から現在の貸出先を表示し、返却時は点検待ちにする。独立した人物・病棟マスタは追加しない。

医療機器の点検はMedicalInspectionとsrc/medical-equipment/inspections.tsで管理する。点検結果、古いフォームと同時操作を検証し、合格後の点検待ち解除と監査を同時保存する。

医療機器の修理はMedicalRepairとsrc/medical-equipment/repairs.tsで管理する。修理中は貸出・点検・運用再開を拒否する。修理完了後も台帳での運用再開と合格点検を必要とする。

任意の医療テストデータはsamples.tsとMedicalSampleDatasetで一度だけ準備する。isSampleを組織に紐づく表示Cookieで絞り込み、通常の業務データは変更しない。overview.tsは同じ一覧条件から状態別台数と直近の点検予定を取得する。
