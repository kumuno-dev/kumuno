# 申請・承認の共通基盤

ソース版の生成アプリには@kumuno/approvalを導入済み。単段の状態遷移エンジンだけで、承認画面・DBモデル・メニュー・医療機器への承認条件は未実装です。公開済みCLI rc.0には未収録です。

## 状態と操作

| 現在 | 操作 | 次の状態 |
| --- | --- | --- |
| DRAFT / RETURNED | SUBMIT | PENDING |
| PENDING | APPROVE | APPROVED |
| PENDING | RETURN（理由付き） | RETURNED |

申請者本人だけが申請・再申請でき、承認/差戻しは本人以外の有効な担当者に限る。組織境界は必須で、Adminも自己承認できない。APPROVEDは終端。取消・却下・代理・多段承認は未実装。

## 業務への追加手順

まず、どの業務の何を承認するか、承認者の条件、申請内容を確定する時点を決める。共有User / Organizationを使い、業務Domain側で申請レコードと履歴のモデル・Migrationを作る。初期DRAFTの作成にも認証・認可とCREATE監査が必要。

権限はアプリ側でapproval:submit / approval:reviewを明示的に割り当てる。例はAdmin/Managerに両方、Userにsubmitのみ。部署や担当者を限定する場合はcanへ追加条件を組み込み、固定ロール表だけで全員に閲覧・承認を開放しない。

HTTP入口で認証・入力検証し、actorIdはセッションから取得する。更新transaction内で最新のrole / isActive / organizationIdと申請をDBから読み、transitionApprovalへ渡す。command.expectedVersionは画面が読んだ版を検証した値で、最新DB版に置き換えない。

保存時は申請ID・組織・旧status・旧versionを条件にUPDATEし、更新件数1を確認する。状態遷移関数だけでは競合を防げない。同じtransactionで履歴・承認後の業務結果・@kumuno/audit-logの監査を保存し、一つでも失敗すれば全体を戻す。Serializableの競合も再操作として扱う。履歴のID・時刻はDBで設定し、理由の自由記述を監査へ丸ごとコピーしない。

ApprovalErrorのcodeはINVALID_REQUEST / INVALID_COMMAND / FORBIDDEN / CONFLICT / INVALID_STATE、statusは400 / 403 / 409。HTTP応答は入口で明示的に変換する。未知例外のDB情報・本文は利用者へ返さない。

パッケージと依存はvendorの実tgzとlockで完結する。更新時は配布物・lock・ライセンス一覧を同時に揃える。既存の備品・医療機器の操作へ自動で承認を要求する変更は加えていない。

申請者・組織は作成後に変更せず、業務内容の編集でもversionを増やす。承認中の内容編集は拒否するか、申請のやり直しを要求するなど業務側で明示する。版を増やさない編集APIを作らない。
