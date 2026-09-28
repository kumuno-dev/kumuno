# 0003: Better Authの標準構成

状態：採用決定済み、未実装。

ユーザーの「Better Authの標準構成に合わせてください」という明示的承認により、認証はBetter AuthとPrisma adapterを採用する。比較は[Milestone 0](../design/milestone-0.md)に記録済み。

Userは業務上の人物を表し、認証資格情報は関連するAccountが所有する。メール・パスワード認証のハッシュは標準のAccount.passwordへ保存する。User.passwordHash必須という旧仕様は変更し、二重保存や標準adapterを曲げる独自実装は行わない。

Prismaは既存選定を継続する。認証用モデルは採用版の公式スキーマに合わせ、業務Organization / Department / Roleはアプリ側で管理する。Better AuthのOrganization等のpluginを機械的に追加しない。

標準構成の採用は、公開サインアップ・メール通知・ソーシャルログイン・SSOの追加を意味しない。v0.1の必須機能に限定する。既存の業務データはまだないため、UserからAccountへのデータ移行作業は発生しない。

依存の正確な版と追加adapterの必要性は実装時に検証・固定する。ログイン、セッション失効、無効ユーザーの既存セッション拒否、認可境界、秘密情報非出力をテストするまで認証完成とは扱わない。

参照：

- [公式DB schema](https://better-auth.com/docs/concepts/database)
- [公式Prisma adapter](https://better-auth.com/docs/adapters/prisma)
- [認証設計](../authentication.md)
