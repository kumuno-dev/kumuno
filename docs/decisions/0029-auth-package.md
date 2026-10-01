# 0029 認証の独立パッケージ化

2026-10-01、採用。ユーザー承認の組合せ型KUMUNOへ移行する第1段階。実装済みの認証を@kumuno/authへ抽出し、RBAC・監査・承認等の抽出は後続とする。

パッケージはBetter Authの設定、環境設定検証、限定したHTTP入口の保護を所有する。利用側はBetter Auth database adapterと最新のユーザー有効状態を返す関数を渡す。Prisma生成Client、DB schema・Migration、Next.js UI、Userの業務照合、組織/権限・監査・無効化transactionはアプリが所有する。Better Auth 1.7.6をpeer dependencyとし、二重導入や別認証実装を避ける。新しい外部依存は追加しない。

未公開の@kumuno/authをRegistryから取得する前提ではCLI生成が壊れるため、正式なnpm packで作ったtgzを生成アプリのvendorへ同梱する。生成物のfile:依存はこの自己完結する配布物だけ許可し、親リポジトリのパス・symlink・workspace参照は認めない。公開後は検証済み版をRegistry依存へ切り替える。現在はnpm Registryへ未公開で、インストール検証は実tgzで行う。

Better Authの更新・DB変更・機能拡張は行わず、従来の認証・RBAC・監査の回帰を検証する。[パッケージの手順](../../packages/auth/README.md)を参照。
