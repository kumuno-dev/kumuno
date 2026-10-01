# 0032: 単段承認の状態遷移を独立パッケージにする

2026-10-02、採用。既存の共通機能の抽出後、新機能の@kumuno/approvalを最小単位で実装する。対象業務が未指定のため、医療機器の貸出・点検・修理へ承認を暗黙に要求しない。

状態はDRAFT / PENDING / RETURNED / APPROVED。本人が申請・再申請し、別の有効な担当者が承認または理由付きで差戻す。差戻し理由はtrim後1〜1000文字。組織越境・自己承認・自己差戻し・他人の申請をAdminも拒否する。取消・却下・多段・代理は今回実装しない。

同期canを必須とし、approval:submit / approval:reviewを利用側で明示する。actorは既存のPrincipalと構造互換で、独自Userモデルは作らない。packageはDBやセッションを参照せず、認証済みIDと同じ更新transactionで読んだ操作者を利用側が渡す。

expectedVersionはフォームで読んだ版を使用し、最新DB版で置き換えない。純粋な遷移関数は元入力を変更せず、次の状態・版と操作情報を返す。実際の保存は旧status/version付きUPDATE、更新件数確認、履歴・業務側の結果・安全な監査を同じtransactionに置く。失敗時は全体を戻す。

examples/approvalは一時テーブルのPostgreSQL接続例で、アプリのMigrationではない。Serializable競合をCONFLICTへ変換し、最新role・無効化・組織境界、同時操作、監査失敗の取消を検証する。理由は業務履歴に保存し、監査へは状態と版だけを渡す。

Node.js 24 / ESM、MIT、外部依存なし。未公開の実tgzをCLIへ同梱し、独立導入・型・ソース/lock一致を検査する。承認画面・業務モデル・通知・Registry公開は後続。
