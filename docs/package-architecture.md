# KUMUNOの組合せ型構成

既存アプリへnpm installで共通機能を追加し、新規アプリはnpx create-kumunoで必要な構成を生成する。業務固有のコードは生成アプリ内で編集可能にする。公開済みCLIの機能をこの文書だけで変更したとは扱わない。

| パッケージ | 境界 | 現在 |
| --- | --- | --- |
| @kumuno/auth | Better Authの設定と認証HTTP入口 | 第1段階の抽出済み、0.1.0-rc.0公開済み |
| @kumuno/rbac | 組織・操作者と業務権限の判定 | 第2段階の抽出済み、0.1.0-rc.0公開済み |
| @kumuno/audit-log | 同一transactionの明示的な変更履歴 | 第3段階の抽出済み、0.1.0-rc.0公開済み |
| @kumuno/approval | 申請・承認・差戻し | 第4段階の状態遷移実装済み、UI/DBは未実装、0.1.0-rc.0公開済み |
| @kumuno/print | A4帳票・ブラウザー印刷/PDF保存 | 第5段階、医療機器台帳票へ接続、npm未公開 |
| @kumuno/csv | CSV/Excel入出力 | 計画、未実装 |
| @kumuno/notifications | アプリ内通知 | 計画、未実装 |
| @kumuno/admin | 共通管理UI | 抽出は未実装、アプリ内の管理UIあり |

ユーザー・組織・操作者の契約、権限の照合、更新と監査のtransaction境界を揃える。パッケージごとに独自UserやOrganizationを作らない。Prisma・Next.js固有の接続は利用側が用意する。共通機能の組合せの選択UI・CLIオプションは後続で、現在のCLIは既定構成のみ。

auth・rbac・audit-log・approvalは独立tgzで導入でき、ソース版CLIにも同梱する。approvalはエンジンと接続例までで、既存業務への承認条件は追加しない。2026-10-02にCLI 0.1.0-rc.1と共通4パッケージをnpmへ公開した。CLIは公開版と同じtgzを同梱し、次の版でRegistry依存への切替を検討する。

RBACは基本6権限と組織境界の純粋な判定を所有する。業務固有の権限割当、セッション検証、DBからの最新操作者照合、更新transactionはアプリ側。詳しくは[RBACパッケージ](../packages/rbac/README.md)と[設計判断](decisions/0030-rbac-package.md)を参照。

監査の共通形式・変更前後の確認・保存関数の呼出しは@kumuno/audit-log。安全な属性投影、PrismaのNULL変換、更新と同じtransaction、DBの追記専用制約はアプリ側に保つ。[監査パッケージ](../packages/audit-log/README.md)と[設計判断](decisions/0031-audit-log-package.md)を参照。

承認は[パッケージ](../packages/approval/README.md)と[実DB接続例](../examples/approval/README.md)を提供する。業務内容・保存モデル・承認者割当・画面・通知はアプリ側。[設計判断](decisions/0032-approval-package.md)を参照。

印刷は[@kumuno/print](../packages/print/README.md)がテキストからA4 HTMLを生成し、アプリ側が認証・組織境界と出力属性を所有する。[設計判断](decisions/0033-print-package.md)を参照。ソースのCLI候補は0.1.0-rc.2、npm公開済みCLIは引き続き0.1.0-rc.1。
