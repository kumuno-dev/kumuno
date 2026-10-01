# 0017: 同梱CLIと依存導入の選択

日付: 2026-10-01

Milestone 11としてCLIの実行時参照をpackage内templateへ移す。正本はtemplates/default、prepackで許可ファイルのみを同梱する。ローカル試用とテストも同じ同梱構成を使う。実行時にリポジトリ外のソースへフォールバックしない。

npmが除外／改名するdotfileは同梱名を変えて生成時に復元する。秘密・生成物・キャッシュ・レポートを除外し、symlinkは拒否する。同梱ディレクトリはGit対象外。CLIのfilesで公開対象を絞り、アプリは独立package / lockを持つ。

TTYでは名前と依存導入を確認、非TTYは名前を必須にして既定は生成だけ。--install / --no-install / --yesを提供し、依存はnpm ci --include=devで導入する。起動・DB・Seed・Git操作は案内に留める。導入失敗時は生成済みファイルを保持して非0終了する。新規dependencyはない。

実tgzをリポジトリ外へインストールし、インストール済みbinから生成と依存導入を実行する検証を追加する。公開はMilestone 14まで行わず、private・0.0.0・UNLICENSEDを維持する。配布物のDB／認証結合、CIと他OSは次の検証工程。
