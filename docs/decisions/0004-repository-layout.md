# 0004: CLI workspaceと独立テンプレート

ユーザーのMilestone 1への進行指示に基づき、小さなmonorepo構成を採用する。比較はMilestone 0の設計案を参照。

rootはprivateで、npm workspacesにはpackages/create-kumuno-appだけを含める。templates/defaultは通常の独立Next.jsアプリとし、package.json・lockfile・設定・テスト・利用者向けdocsを保持する。rootのnpm ciと、テンプレート依存を導入するnpm run setupを明示的に分ける。

CLIはまだ実装しない。誤公開を防ぐためCLI packageも現段階ではprivateとし、binや空の成功コマンドは設けない。rootのcheckはworkspace境界と実装済みテンプレートを検証する。CLIテストが実行済みとは扱わない。

Next.jsのTurbopackと出力traceのrootをアプリの作業ディレクトリに限定する。採用版同梱docsのturbopack.root / outputFileTracingRootを確認した。コマンドはアプリ内で実行し、rootの委譲もnpm --prefixでその前提を維持する。親のlockfileや依存を使って偶然ビルドが通る状態を避ける。

製品のmaster-spec・工程と、テンプレート利用者向けdocsを分ける。DB運用規約はテンプレート側を正本とし、製品docsは参照する。認証・業務モデル・CLI生成処理・npm公開は今回追加しない。依存追加もない。

## 検証

rootとtemplateのnpm ci、構成検査、lint・型チェック・本番ビルド、単体10件・DB6件・ブラウザー4件が成功。親リポジトリ外へのコピーもnpm ciからビルドまで成功した。rootからのDBコマンドと引数転送を確認。CLI生成処理のテストは未実装。
