# 0016: 生成アプリ内で完結するAI開発文書

日付: 2026-10-01

Milestone 10として仕様書第26〜29章の文書をテンプレートへ揃える。AGENTS.md / CLAUDE.mdは同じdocsを読む入口にし、詳細仕様は重複させない。生成アプリには製品開発のMaster Specificationや過去の工程履歴を要求しない。

Domain model→Migration→Validation→Authorization→Data access→Business logic→UI→Audit→Tests→Documentationの順序をadding-a-featureへ明記する。Equipmentの現在のservice / repository / actionsと共通機能を参照できるようにする。Domain境界・将来連携・デプロイ文書は現在の実装と未実装を区別する。

check-application-docs.mjsで必須文書・ローカルリンク・生成物内の完結性を確認し、check:structureとCLI生成検証の両方に組み込む。チェックは依存インストール前に実行する。新規dependencyはない。アプリ処理・DB・公開APIは変更しない。

両AIが実際に新機能を追加するAcceptance Test D / E、配布tgzからの生成、本番デプロイはこの工程の文書整備とは別の確認事項。文書だけでこれらの受け入れ試験が成功したとは扱わない。
