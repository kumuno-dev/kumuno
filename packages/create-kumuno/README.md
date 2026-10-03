# create-kumuno

Node.js 24.x / npmで、認証・認可・監査・ユーザー／部署管理・備品管理とAI開発文書を持つNext.jsアプリを生成する。CLIは同じnpmパッケージ内のtemplateを読み、実行時に製品リポジトリへアクセスしない。

公開候補は0.1.0-rc.0、[MIT License](LICENSE)を採用。npm Registryへ公開済み。npx create-kumuno@next my-appで試せる。初回公開でlatestも同版を指し、削除要求はnpm側が400で拒否した。候補版のため試用では@nextを明示する。正式版の開始コマンドはnpx create-kumuno my-appを予定する。

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

リポジトリを取得し、Node.js 24.xでrootのnpm ciを実行してから試す。

```sh
npm ci
npm run create:app -- my-app --install
cd my-app
npm run dev
```

ソース版では生成先でnpm run dev:localを実行し、開発用PostgreSQL・認証・初期管理者まで自動で準備できる。初期パスワードは生成先の.kumuno/local/login.txt。既存DB・本番は生成先READMEの手動設定を使う。この経路はnpm公開済み0.1.0-rc.1から利用できる。ソースの次の候補0.1.0-rc.2には医療機器のA4台帳票と@kumuno/printを追加しているが、この追加分は未公開。

rootでnpm run create:app -- my-appを実行すると依存導入を対話で選べる。毎回テンプレートを同梱ディレクトリへ再生成してから起動する。直接nodeでCLIを実行する場合は、先にrootのnpm run build:cliで同梱内容を更新する。

## 同梱と検証

prepackでtemplates/defaultから許可したファイルをコピーする。templateは生成物なのでGitへ含めない。npmが除外・改名するdotfileは__gitignore / __npmrc / __nvmrc / __env.exampleへ変換し、アプリ生成時に元へ戻す。LICENSEと依存ライセンス一覧も生成アプリへ同梱する。Node Modules・Prisma生成物・キャッシュ・レポート・実際の.envは除外する。

rootのnpm run test:cliは生成・入力拒否・既存先保護・依存導入失敗を検証する。npm run test:packは実tgzをリポジトリ外へインストールし、生成・実依存導入・文書・生成アプリのcheckを確認する。npm公開は行わない。

rootのnpm run test:pack:dbは専用TEST_DATABASE_URLを必須にし、配布物から生成したアプリのcheck・Migration/Seed再実行・実DB・認証/業務ブラウザーテストを実行する。GitHub ActionsでもUbuntu・Node.js 24・PostgreSQL 18・Chromiumで同じ検証を行う。

Windows用のnpm呼出し分岐はあるが実行未検証。npm Registryからのnpx生成・check・DB/認証/業務画面の検証は完了。正式版のAcceptance Testは後続工程。
