# @kumuno/print

A4縦のHTML帳票とブラウザー印刷の共通処理。MIT、Node.js 24.x / ESM、外部依存なし。React・Next.js・DBには依存しません。

npm未公開。`npm run build:print`でtemplates/default/vendor/kumuno-print-0.1.0-rc.0.tgzを作り、コピーして `npm install /absolute/path/kumuno-print-0.1.0-rc.0.tgz` で導入できます。

```ts
import {renderPrintDocument, PRINT_HEADERS, PRINT_SCRIPT} from "@kumuno/print";
// 利用アプリの認証・認可を済ませ、対象を組織で絞って取得する。
const html = renderPrintDocument({title:"機器台帳票", fields:[{label:"管理番号",value:device.managementNumber}]});
return new Response(html, {headers:PRINT_HEADERS});
// 別の同一originの /print-client.js でPRINT_SCRIPTをJavaScriptとして配信する。
```

title / subtitle / fields / tables / footerはプレーンテキスト。全値をHTMLエスケープし、任意のHTML・画像URL・CSS・JavaScriptの挿入機能は提供しません。表は列数を検証します。scriptPathは同一originの絶対パスのみ。業務値は許可した属性を明示し、秘密・HTTP本文を丸ごと渡さないでください。

用紙A4縦・余白16mm。長文は折り返し、表の見出しを改ページ時に繰り返します。印刷ボタンはPRINT_SCRIPTがwindow.printを呼び、PDF保存はブラウザーの印刷ダイアログで行います。自動印刷やサーバー側のPDF生成、外部帳票サービスは利用しません。実機プリンター、ブラウザーごとの余白・ヘッダー/フッター設定は利用側で確認してください。

PRINT_HEADERSはno-store/private、Cookie別のVary、nosniff、外部通信とiframe表示を制限するCSPを提供します。これだけでは認証・認可はできません。利用アプリで最新の操作者・組織を確認し、印刷ルートでも対象を絞ります。時刻・業務項目・状態の意味・帳票の保管はアプリ側が所有します。
