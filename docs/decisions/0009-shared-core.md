# 0009: Shared Coreと開発Seed

2026-09-28。承認されたMilestone 4を実装する。比較済みのUUID v4をPrismaのuuid()で生成する。組織所属を必須とし、部署所属と社員番号は任意。複合外部キーで所属の組織一致を保証する。部署の親変更は小さなserviceに集約し、Serializable transactionと祖先検査で循環を防ぐ。汎用階層ライブラリ・closure tableは追加しない。

採用済みBetter Authの1.7.6を正確なバージョンで導入した。目的は標準認証モデルの固定とSeedの標準ハッシュ生成。MIT、継続開発される公式パッケージ。npm metadataとインストール版の@better-auth/core DB定義・sign-upのcredential登録処理を確認。独自scrypt実装や別ハッシュライブラリは形式の不一致を招くため採用しない。標準のproviderId / accountIdを使い、issuer列は追加しない。User.organizationIdを必須にするためMilestone 5で全作成経路への供給とUUID生成設定が必要。Session・Verificationは標準スキーマ整合性のため同時に定義するが、認証の入口はまだ実装しない。

参考：[標準モデル](https://better-auth.com/docs/concepts/database)。実装時点のnpm auditは0件。npmのoptional dependency欠落が再発したため、空ディレクトリでlockfileを再生成してnpm ciで検証する。新規の業務依存は追加しない。

Seedは明示的な開発用フラグ・外部指定パスワードを要求し、productionでは拒否する。Account.passwordに標準hashPasswordの結果を保存。再実行で更新・パスワード再設定を行わず、メール衝突はロールバック。権限はMilestone 6で追加するため「開発用管理者」は現段階で権限を持たない。Seedを本番プロビジョニングへ流用しない。
