# 生成アプリへの社員研修追加

Master SpecificationのAcceptance Test D / F / Gで使った差分。`create-kumuno@0.1.0-rc.0`の生成アプリへ適用する。標準テンプレートにTrainingを組み込む変更ではない。

```sh
npx --yes create-kumuno@0.1.0-rc.0 training-demo --no-install
cd training-demo
git apply --check /path/to/kumuno/examples/training-acceptance/training.patch
git apply /path/to/kumuno/examples/training-acceptance/training.patch
npm ci
```

以後は生成アプリのREADMEに従って専用PostgreSQL、Migration、開発Seed、認証設定を用意する。研修の仕様は生成アプリのdocs/training.md。DB名・接続先・パスワードは各自で設定する。この差分には資格情報を含めない。

KUMUNO本体から公開済みCLIの取得・適用・検証を再現する場合:

```sh
npm run test:acceptance
npm run test:acceptance:db
```

Node.js 24、Git、ネットワーク、Chromiumが必要。後者は専用`TEST_DATABASE_URL`（DB名が`_test`で終わる）が必須。本体のtemplates/default/.env.test.localまたは環境変数で設定する。新しいnpmキャッシュと一時ディレクトリを使い、正常終了時に削除する。失敗時は調査用生成物を残し、DB検証ヘルパーは資格情報ファイルと作成schemaを除去する。

差分はこのRC専用。新版に自動追従する仕様ではなく、新版の受入時には適用・差分・テストを再確認する。再現スクリプトは検証済みの機能を適用するもので、AIが新たに要件を解釈するAcceptance Test D / Eの代わりにはならない。

結果・制限・Claude Codeでの後日確認は[受入記録](../../docs/acceptance/v0.1.md)を参照。
