# 0006: 生成したテンプレートの継続検証

Milestone 2として、CLI確認後のテンプレートを独立アプリとして検証する。単なるファイルコピー確認では、依存生成・lint・型チェック・本番起動まで成立することを保証できないため、rootにtest:templateを追加する。

Node.js標準機能でOSの一時ディレクトリを確保し、実CLIから生成する。開発者のDATABASE_URL / TEST_DATABASE_URL / SHADOW_DATABASE_URL / NODE_PATHを引き継がず、生成アプリ内でnpm ciとnpm run checkを実行する。npmは実行中のnpm_execpathをNodeで起動し、shell文字列へパスを埋め込まない。追加依存はない。

生成直後に環境ファイル・生成キャッシュ・製品開発用のmaster-spec参照が混入していないことを確認する。成功時は今回の一時ディレクトリのみ削除し、失敗時は調査用に残す。通常のcheckとブラウザー用ポートが同じなので順次実行する。

これはローカルCLIと現在のNext.js基盤の検証であり、npm配布物の同梱検査・CI・完成した業務機能の受け入れテストはMilestone 12以降に残る。DB接続の生成物検証はMilestone 3で扱う。業務機能を先回りして追加しない。

検証結果：npm run checkとnpm run test:templateが成功。生成物のnpm ci・lint・型チェック・単体10件・本番ビルド・ブラウザー4件を確認した。DB結合テストは本工程では再実行していない。
