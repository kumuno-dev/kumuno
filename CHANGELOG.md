# 変更履歴

## Unreleased

正式版v0.1のAcceptance Test確認は未完了です。次の公開に向けた変更はここへ追記します。

## create-kumuno 0.1.0-rc.0 — 2026-10-01

公開候補版をnpmへ公開し、新しいnpmキャッシュでRegistryからの生成・ビルド・DB・認証・業務操作を検証しました。正式版ではありません。next / latestともにこの候補版を指します。以下を含みます。

- 認証・DBセッション、組織・階層部署・ユーザー、ADMIN / MANAGER / USERの認可。
- 業務更新と同時に保存する追記専用監査ログ。
- 共通画面、ユーザー・部署管理、備品CRUD・検索・ページング・並び替え。
- 生成アプリ内のAI開発文書と機能追加手順。
- create-kumunoのテンプレート同梱、対話入力、依存導入オプション、失敗時の生成物保持。
- 実tgzからのアプリ生成・check・DB/認証結合テストとGitHub ActionsのCI。
- README、開発・貢献・セキュリティ文書、文書一覧。
- MIT LICENSEの同梱、create-kumuno@0.1.0-rc.0の公開メタデータ、依存ライセンス一覧と検査。

公開までの工程と検証実績は[architecture.md](docs/architecture.md)を参照してください。MITを採用済みです。Release CandidateのAcceptance Test確認が残っています。
