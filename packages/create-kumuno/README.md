# create-kumuno

Node.js 24.x / npmで、認証・認可・監査・ユーザー／部署管理・備品管理とAI開発文書を持つNext.jsアプリを生成する。CLIは同じnpmパッケージ内のtemplateを読み、実行時に製品リポジトリへアクセスしない。

現在はprivate・0.0.0・UNLICENSEDの配布準備版。npm Registryへは未公開。公開時のコマンドはnpx create-kumuno my-appを想定し、名前・版・ライセンスは公開工程で確定する。

## オプション

```text
create-kumuno <project-name> [--install | --no-install] [--yes]
```

- 名前は小文字英字で始まる英数字・ハイフンの1〜64文字。パス・予約名・既存先は拒否する。
- 名前なしのTTY実行では名前を尋ねる。非TTYと--yesでは名前を必須にする。
- 対話実行ではnpmによる依存導入をY/nで確認する（既定Y）。
- --installはnpm ci --include=devで依存を導入する。--yesは名前指定後の確認を省いて導入する。
- --no-installは生成だけ。非対話でオプション未指定の場合も導入しない。
- --no-installと--install / --yesの併用、不明なオプションは拒否する。
- 失敗時は非0で終了し、生成済みファイルを残す。再導入は生成先でnpm ciを実行する。

DB作成・Migration・Seed・サーバー起動・Git操作は自動実行しない。生成先READMEの設定手順とdocs/adding-a-feature.mdを案内する。資格情報や開発環境の.envをコピーしない。

## 開発リポジトリからの試用

rootでnpm run create:app -- my-appを実行する。毎回テンプレートを同梱ディレクトリへ再生成してから起動する。直接nodeでCLIを実行する場合は、先にrootのnpm run build:cliで同梱内容を更新する。

## 同梱と検証

prepackでtemplates/defaultから許可したファイルをコピーする。templateは生成物なのでGitへ含めない。npmが除外・改名するdotfileは__gitignore / __npmrc / __nvmrc / __env.exampleへ変換し、アプリ生成時に元へ戻す。Node Modules・Prisma生成物・キャッシュ・レポート・実際の.envは除外する。

rootのnpm run test:cliは生成・入力拒否・既存先保護・依存導入失敗を検証する。npm run test:packは実tgzをリポジトリ外へインストールし、生成・実依存導入・文書・生成アプリのcheckを確認する。npm公開は行わない。

Windows用のnpm呼出し分岐はあるが、実行検証はmacOSのみ。npm Registryからのnpx実行、公開版、CIでの配布検証は後続工程。
