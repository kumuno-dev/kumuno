# 0020: MITとnpm公開候補

- 日付: 2026-10-01
- 状態: 採用

## 決定

ユーザー承認により本体・CLI・生成テンプレートはMITとする。LICENSEをそれぞれに配置し、生成対象へ追加する。依存は各パッケージ自身の許諾を保持し、lockfileの全497項目を一覧化する。直接依存のpackage.json / 許諾文も確認する。

CLIはcreate-kumuno@0.1.0-rc.0とし、publishConfigでnpm公式registry・public・nextを指定する。rootと生成アプリのprivateは維持する。repository.directory、説明、homepage、bugs、keywordsを設定し、lockfileの自前メタデータだけを更新する。依存版・integrityは変更しない。

ライセンス一覧と公開メタデータの検査をcheckに加え、配布テストでもLICENSEと依存一覧の復元を確認する。通常CIからの自動公開は追加しない。手動公開・固定tgz・dry-run・公開後検証の手順を[releasing.md](../releasing.md)へ記録する。

npm名照会はE404、npm whoamiはENEEDAUTH。GitHubリポジトリもprivateのため、実公開・Registry検証・GitHubの公開設定と報告窓口の確定は未完了。公開名の確保やprovenanceの成功は約束しない。
