# 0021: 公開RCの生成物で研修追加を受け入れる

2026-10-01。Master SpecificationのD / F / Gを、公開済みcreate-kumuno@0.1.0-rc.0から生成したアプリで検証する。Trainingを標準テンプレートへ先行追加せず、独立アプリの差分をexamples/training-acceptanceへ保存する。

既存のUser / Departmentと認可・監査・共通フォームを再利用し、業務属性はTrainingへ置く。新しいライブラリや抽象Frameworkを追加しない。新規Migrationは専用開発／shadow DBでPrismaから生成し、明示transactionと期限制約をレビューして追加する。適用済みMigrationは変更しない。

再現コマンドは公開版を固定し、Registry取得・新しいnpmキャッシュ・生成・差分適用・check・任意の実DB／ブラウザー検証を行う。差分適用テストはAI自身の理解確認を置き換えない。

ユーザー指定でClaude Codeは後日確認する。E未確認のままM15全体を完了扱いにせず、正式版の公開条件として残す。正式版のlatestと候補版のnextを区別する方針は採用するが、現時点では版とタグを変更しない。

検証結果と制限は[受入記録](../acceptance/v0.1.md)を参照。
