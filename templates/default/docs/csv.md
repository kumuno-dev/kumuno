# 医療機器台帳のCSV出力

医療機器台帳の「現在の条件でCSV出力」を押すとmedical-devices.csvをダウンロードする。検索するボタンで適用した条件、台帳上の状態・運用状況、テストデータあり/なしを反映する。現在のページだけでなく全ページを出力し、最大1000台・UTF-8で2MiBまで。該当なしの場合は見出しだけを出力する。超過時は条件を絞る案内を表示し、一部だけをダウンロードしない。

出力列は管理番号・機器名・資産番号・種別・メーカー・型式・製造番号・部署名・設置場所・購入日・保証期限・台帳上の状態・返却後の点検待ち・現在の貸出先・テスト機器の区別。備考、内部ID、組織ID、ユーザー情報、全履歴は含めない。台帳は変更しない。

## Excelで確認する

CSVはUTF-8 BOM付き、カンマ区切り、CRLF。Excelの「データ → テキスト/CSVから」で開き、管理番号・資産番号・製造番号などは文字列として扱う。ダブルクリックで開くと、Excelが先頭ゼロを消したり日付に変換する場合がある。xlsx出力やExcelの自動型推論の制御は未対応。

数式の可能性がある開始文字（全角・空白の後も含む）の値がある場合は、CSV全体を422で拒否し、該当件数順の位置と列を案内する。業務値を自動変換しない。[設計参考](https://community.owasp.org/attacks/CSV_Injection)。

## 実装と境界

GET /dashboard/medical-equipment/exportでrequirePermission("medical-equipment:read")を通し、セッションの組織IDを使う。URLのorganizationId等で組織を変更できない。medicalDeviceWhereを一覧と共有し、includeMedicalSamplesの現在のCookieを使う。exportMedicalDevicesは同じRepeatableRead transaction内で明示的な属性を取得する。private/no-store・CookieのVary・nosniffとattachmentを付ける。未知の例外は通常のアプリのエラー処理へ渡す。

@kumuno/csvはDBに依存せず、parseCsvで引用符・改行・BOM・列数と上限を検証し、stringifyCsvで文字列だけを出力する。読込元のUTF-8デコード、業務項目、必須列、権限、重複、部署の解決、保存と監査は利用側で実装する。parseCsvを呼んでもDBへは保存されない。

## 範囲と検証

医療台帳の一括登録・取込確認画面、xlsx/Shift_JIS、部署マスタ作成、Excel実機の全挙動は今回未実装/未確認。CSV保存だけで台帳への一括登録ができるとは扱わない。

製品リポジトリのtest:csv-packageで形式・境界・独立導入・公開型、test:dbで別組織除外・テスト選択・全ページ・上限拒否・読み取りによる保持、test:authで3画面幅の実ダウンロード・BOM・検索条件・未ログイン・別組織の拒否を確認する。
