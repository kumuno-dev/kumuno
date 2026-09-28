# アプリの構成

Next.js・Prisma・PostgreSQL基盤、共有マスタ（Organization・Department・User）、開発Seedを実装済み。Better Authによるログイン・ログアウト・保護ページを実装済み。3ロールの共通認可を実装済み。業務管理画面は未実装です。

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
