# @kumuno/csv

CSVの文字列読込・形式検証と、表計算向けCSV出力。MIT、Node.js 24.x / ESM、外部依存なし。DB・Next.js・Reactには依存しない。

npm未公開。製品リポジトリで`npm run build:csv`を実行し、vendorのkumuno-csv-0.1.0-rc.0.tgzを別アプリへコピーしてnpm installで導入する。

```ts
import {parseCsv, stringifyCsv, CsvError} from "@kumuno/csv";
const csv = stringifyCsv({headers:["管理番号","機器名"], rows:[["ME-001","輸液ポンプ"]]});
const records = parseCsv(csv);
```

parseCsvはBOM、カンマ、CRLF/LF、二重引用符と引用符内の改行に対応し、全行の列数を確認する。値を文字列として保ち、数値・日付へ自動変換しない。空文字列は行なし、空行は1列の空文字列として扱う。閉じていない引用符、引用符外の不正な文字、単独CR、NULを拒否する。エラーのrow/columnは1始まりの論理レコード/列。値をエラーへ含めない。

上限はUTF-8で2MiB、ヘッダーを含む10001行、64列、セル10000 UTF-16コード単位。optionsで上限を小さくできる。超過は拒否し、切り詰めない。ファイルから読む側はバイト数を先に確認し、UTF-8を厳密にデコードする。業務項目・必須列・組織・権限・重複・保存transactionは利用アプリの責任。

stringifyCsvは全値を二重引用符で囲み、引用符を二重化し、CRLFとUTF-8 BOM（bom:falseで無効）を付ける。数式記号・先頭タブ/改行・空白等に続く数式記号・全角の数式記号で始まる値はFORMULA_PREFIXで出力全体を拒否する。業務値を自動書換えしない。parseCsv自体は数式文字列を評価しない。

Excelの型推論による先頭ゼロ・日付の変換は保証しない。管理番号などは「データ → テキスト/CSVから」で文字列列として読み込む。xlsx/Shift_JIS、DBへの一括登録、Excel実機の全挙動は今回未対応。

設計参考: [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection)。
