# KUMUNOの組合せ型構成

既存アプリへnpm installで共通機能を追加し、新規アプリはnpx create-kumunoで必要な構成を生成する。業務固有のコードは生成アプリ内で編集可能にする。公開済みCLIの機能をこの文書だけで変更したとは扱わない。

| パッケージ | 境界 | 現在 |
| --- | --- | --- |
| @kumuno/auth | Better Authの設定と認証HTTP入口 | 第1段階の抽出対象、未公開 |
| @kumuno/rbac | 組織・操作者と業務権限の判定 | 次の抽出候補、アプリ内実装済み |
| @kumuno/audit-log | 同一transactionの明示的な変更履歴 | 次の抽出候補、アプリ内実装済み |
| @kumuno/approval | 申請・承認・差戻し | 計画、未実装 |
| @kumuno/print | 帳票・PDF・印刷 | 計画、未実装 |
| @kumuno/csv | CSV/Excel入出力 | 計画、未実装 |
| @kumuno/notifications | アプリ内通知 | 計画、未実装 |
| @kumuno/admin | 共通管理UI | 抽出は未実装、アプリ内の管理UIあり |

ユーザー・組織・操作者の契約、権限の照合、更新と監査のtransaction境界を揃える。パッケージごとに独自UserやOrganizationを作らない。Prisma・Next.js固有の接続は利用側が用意する。共通機能の組合せの選択UI・CLIオプションは後続で、現在のCLIは既定構成のみ。

最初にauthの独立tgz導入と生成アプリの回帰を確認する。その後rbac、audit-logを順に抽出する。npm公開は配布物と手順を整えた別の工程で行う。
