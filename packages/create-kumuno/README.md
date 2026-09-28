# create-kumuno — local preview

rootで`npm run create:app -- my-trial-app`を実行する。現在のNext.js / Prisma基盤を生成し、依存インストールと起動手順を表示する。メール・パスワード認証を含む。DB・認証設定・開発Seedは生成先READMEを参照。業務機能は未実装。

依存インストールは手動。既存先への上書き、パス指定、不明オプションを拒否する。名前なしのTTY実行では名前を尋ねる。非TTYでは名前が必須。`--help`と`--no-install`に対応する。

リポジトリのtemplates/defaultを参照するローカル試用版であり、単独配布物ではない。privateを維持し、npm公開とテンプレート同梱は後続工程とする。
