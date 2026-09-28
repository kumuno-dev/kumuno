# Application guide

作業前に[README](README.md)、[構成](docs/architecture.md)、[DB規約](docs/database.md)を確認する。仕様の正本はdocsとする。

- ユーザーの依頼を小さな単位で実装する。
- 通常のNext.js / TypeScriptとして理解できるコードを維持する。
- 実装・依存変更時は理由と関連するdocsを更新する。
- 変更後はREADME記載の検証を実行し、未確認事項を報告する。
- Next.jsのAPI変更時は採用版のnode_modules/next/dist/docsを確認する。
