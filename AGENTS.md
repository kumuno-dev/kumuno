# Project guide

作業前に[最上位仕様](docs/master-spec.md)と[現在の構成・工程](docs/architecture.md)を確認してください。仕様のSingle Source of Truthは`docs/`です。

- ユーザーが承認した工程を小さな単位で完了させる。後続の業務機能を先回りして実装しない。
- 通常のNext.js・TypeScriptとして理解できるコードを維持する。
- 設計判断・依存追加の理由は`docs/decisions/`に記録し、実装変更時に関連文書を更新する。
- 変更後はREADMEに記載した検証を実行し、実行結果と未確認事項を報告する。

コマンドと前提環境は[README](README.md)を参照してください。認証方式と資格情報の保存規約は[認証設計](docs/authentication.md)を参照してください。

Next.jsのAPIを変更する際は、インストール版に対応する`templates/default/node_modules/next/dist/docs/`の該当文書も確認してください。
