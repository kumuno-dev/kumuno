# 依存ライセンスの確認記録

KUMUNO本体・CLI・生成テンプレートはユーザー決定により[MIT License](../LICENSE)を採用します。独自コードのLICENSEは本体・CLI・生成先で同じ内容を保持します。

生成アプリの[宣言一覧](../templates/default/docs/dependency-licenses.md)と[全項目JSON](../templates/default/docs/dependency-licenses.json)に、rc.0ではlockfile全497項目（推移依存・OS別optionalを含む）の版とライセンス宣言を記録しました。宣言欠落はありません。JSONのSHA-256はアプリ名を除いた依存項目に対応し、生成時のアプリ名変更でも一致します。

rc.0の直接依存24件のインストール済みpackage.jsonを確認し、許諾文が同梱された22件のLICENSE / NOTICEも確認しました。server-onlyと@next/eslint-plugin-nextはpackage.jsonのMIT宣言のみで、許諾ファイルは同梱されていません。MIT以外のLGPL・MPL・EPL・CC-BY等の宣言も一覧へ残しています。libvipsのバイナリ内部の構成までlockfileだけで網羅するものではありません。バイナリやアプリ成果物を再配布する場合は、その配布物に含むコンポーネント・許諾文・著作権表示・対応ソースを別途確認します。

CLI自体に実行時のnpm依存はありません。CLIのtgzにはnode_modules・第三者ネイティブバイナリを同梱せず、生成アプリのnpm ciで取得する構成です。LICENSEと宣言一覧の同梱・生成物への復元を配布テストで確認します。

依存変更後はnpm run licenses:updateで一覧を再生成します。npm run check:licensesはlockfileとの不一致やlicenseの欠落を失敗とします。依存ライブラリの許諾を本体のMITで上書きする処理はありません。


開発用セットアップ追加（rc.1候補）ではembedded-postgres 18.4.0-beta.17を開発依存として追加した。全507 lockfile項目の宣言と直接依存25件へ記録を更新した。実行時のPostgreSQLネイティブバイナリは生成先のnpm ciが取得し、CLIのtgzには含めない。[選定と保守の判断](decisions/0022-local-development-postgres.md)を参照。
