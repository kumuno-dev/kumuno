# 0022: 開発用PostgreSQLを自動起動する

2026-10-01。ユーザーが「本番DBの構築とは分けて、まず手元で動くまでを簡単にする」方針を承認した。生成アプリへnpm run dev:localを追加する。PostgreSQLやDockerを手動導入する前提を外し、npm ciで取得した実PostgreSQLをローカルだけに起動する。

embedded-postgres 18.4.0-beta.17（MIT）を開発依存へ固定する。[公式実装と対応OS](https://github.com/leinelissen/embedded-postgres)を確認した。通常のPostgreSQL 18.4と既存Prisma / Migration / Seedを使い、SQLiteや独自DBに置き換えない。これはbeta版の起動補助であり、KUMUNOの本番ランタイムには含めない。対応するネイティブバイナリをnpmのoptional依存が取得し、install scriptsが必要。更新時はネイティブ実行と再起動を検証する。全507 lockfile依存項目のライセンス宣言を更新した。バイナリ内部の許諾文を再配布する場合はその実体を別途確認する。

代替はDocker ComposeまたはHomebrewでの手動導入。どちらも初心者へ別ツールの導入・常駐サービス管理を要求するため、最初の試用には自動起動を選ぶ。通常の手動接続と本番の構築は残す。

専用workerがPostgreSQLを起動し、runnerが準備・Migration / 開発Seed・Next.js・終了を管理する。ランダムなDB資格情報・認証鍵・初期管理者パスワードをmode 0600へ保存し、標準出力には出さない。管理者パスワードは専用login.txtで本人が確認する。DBは永続化して再利用し、失敗時に自動削除・リセットしない。

環境変数の既存接続・既存.env.local・変更された管理対象設定・symlinkを拒否する。組み込みDBは127.0.0.1のみ、アプリ接続は非スーパーユーザー、dev / shadow / testは別DB。二重起動は専用lockで拒否し、正常終了時に解除する。本番モードとroot実行を拒否し、OSユーザーの作成やsudoは行わない。

公開済みrc.0は変更できないため、次の候補rc.1として準備する。候補の実公開と正式版latestへの更新はそれぞれの配布検証・承認・本人確認を経て行う。Claude CodeのAcceptance Test Eは引き続き後日確認。

検証: 設定保護・再実行・秘密ファイル権限の単体テスト、実tgzから生成したアプリの初回起動・実ログイン・備品CRUD・非管理者ロール・二重起動拒否・終了・既存ID／備品／監査を保持した再起動を確認する。CIでも既存DB結合テストと合わせて実行する。詳細な結果は[現在の工程](../architecture.md)に記録する。
