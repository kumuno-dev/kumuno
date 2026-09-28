# 0010: KUMUNO v3.1とCLI名

2026-09-28。ユーザーが指定したLPのコピー・開始コマンド・「組む」の思想を正式仕様に反映する。0008のcreate-kumuno-appという暫定名称をcreate-kumunoで置き換える。

package名・bin名・workspaceディレクトリ・root scripts・lockfile・生成検証のパスを一括更新する。依存追加なし。公開前なので旧名のエイリアスは追加しない。過去の選定記録の記述は履歴として残す。npm名の確保と公開権限は公開工程で再確認する。

v3.1は単純な改名ではなく、人とAIで組む、共通基盤に必要な業務を組む、共有IDとDomain境界で後からつながる、という原則を明文化する。独自ランタイムや自動連携基盤を先行導入する根拠にはしない。Prisma・Better Auth・Accountへのハッシュ保存・既存のAcceptance Testを維持する。

LPはkumuno-siteの別リポジトリ。CloudflareへのデプロイとOSS本体のnpm公開は別の状態として扱い、未公開CLIを利用可能と案内しない。
