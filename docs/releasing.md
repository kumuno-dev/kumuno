# create-kumunoの公開手順

この文書はメンテナー向けです。現在の候補はcreate-kumuno@0.1.0-rc.0、MIT、npmのnextタグです。2026-10-01にnpmへ公開済みです。rootと生成アプリはprivate: trueを維持し、CLIだけを公開可能にしています。

## 公開前の確認

Node.js 24.xでrootのnpm ciとnpm run setupを実行し、Chromiumと専用_test DBを用意します。手順は[開発ガイド](development.md)を参照してください。

```sh
npm run check
npm run test:pack:db
```

CIも確認します。npm run checkには、MIT / LICENSE・版 / lockfile一致・公開メタデータ・依存ライセンス一覧の検査を含みます。

パッケージ名は公開直前にも確認します。

```sh
npm view create-kumuno name version --registry=https://registry.npmjs.org/ --json
```

2026-10-01の照会はE404でした。未検出は名前の予約や公開成功を保証しません。公開アカウントの権限も必要です。

## npm認証とGitHubの公開状態

このMacのnpmログインと2FA設定を確認し、2026-10-01に本人確認を経て公開が成功しました。最初の試行は2FA無効で403となりました。メンテナー本人がnpmのAccount → Two-Factor Authentication → Enable 2FAで設定します。[公式設定手順](https://docs.npmjs.com/configuring-two-factor-authentication/)を参照してください。メンテナー本人がnpmへログインし、公開するアカウントを確認します。パスワード・OTP・トークンをチャットやGitへ貼り付けません。

```sh
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
```

GitHubは2026-10-01にユーザー承認によりpublicへ切り替えました。[非公開脆弱性報告](../SECURITY.md)も有効です。候補版のnpm公開も承認済みで、2FA設定・公開操作の本人確認を完了し、候補版の公開は成功しています。公開操作時にはnpmが要求するブラウザーやOTPの本人確認を完了します。

## 配布ファイルを固定する

rootでpack先を作り、tgzを保存します。

```sh
mkdir -p artifacts
npm pack --workspace create-kumuno --pack-destination artifacts --json
npm publish ./artifacts/create-kumuno-0.1.0-rc.0.tgz --dry-run --tag next --access public --registry=https://registry.npmjs.org/
```

prepackがテンプレートを再同梱します。ファイル一覧とSHA-512 integrityを確認し、LICENSE、生成アプリのLICENSE・依存一覧が含まれ、実.env・node_modules・生成キャッシュがないことを確認します。dry-runは公開を行いません。npm run test:pack:dbは同じpack処理で作った独立tgzを検証します。

## 公開する

メンテナーが候補版・配布内容・公開アカウントを確認し、公開を承認した後に、確認済みのtgzを公開します。npmの同じ名前・版は再利用できません。

```sh
npm publish ./artifacts/create-kumuno-0.1.0-rc.0.tgz --tag next --access public --registry=https://registry.npmjs.org/
```

公開にはnextタグを指定しましたが、初回公開ではnpm側でlatestも同じ候補版を指しました。latest削除は400で拒否され、現在は両タグが0.1.0-rc.0です。試用では@nextを明示します。正式版と誤認しないようREADMEでも候補版と表示します。公開後にnpm viewで版・タグ・dist.integrityを確認し、別のディレクトリでRegistry経由の生成・check・DB検証を行います。

```sh
npm view create-kumuno@next version dist.integrity --registry=https://registry.npmjs.org/
npx --yes create-kumuno@next registry-trial --install
```

正式版0.1.0とlatestへの公開はMilestone 15のAcceptance Test A〜GとRelease Candidate確認の後に判断します。Git tag / GitHub Release / LPの公開状態も、実際の公開結果に合わせて更新します。

## 自動公開

通常CIは公開しません。初回は上記の手動認証・確認で進めます。後でTrusted Publishingを設定する場合はnpm側のパッケージ設定とGitHub workflowの対応を確認します。privateリポジトリではprovenanceが生成されないため、この状態でprovenance付き公開を約束しません。

参考: [npm publish](https://docs.npmjs.com/cli/commands/npm-publish/)、[package.json / publishConfig](https://docs.npmjs.com/cli/configuring-npm/package-json/)、[Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。

## 0.1.0-rc.0の公開検証記録

Registryのdist.integrityは保存したtgzと一致しました。新しいnpmキャッシュ・リポジトリ外の一時ディレクトリでnpx --yes create-kumuno@next registry-app --installを実行し、文書・lint・型・単体21件・本番ビルド・ブラウザー4件が成功。一時PostgreSQL 18.4の非管理者ロールでMigrationとSeedの初回/再実行、DB27件、PC/タブレット/スマートフォンの認証・権限・管理・備品操作も成功しました。一時生成物・DBは終了後に除去しました。

候補版tgzの同一版での再公開は行いません。公開後のREADME状況更新はGitHub上で反映し、npm同梱文書への更新は次の版へ含めます。


## 正式版とタグの方針

正式版は0.1.0をlatestで公開し、nextを候補版の入口にする。ユーザー承認によりこの方向を採用した。現在は[受入記録](acceptance/v0.1.md)のE（Claude Code）が後日確認であり、版・publishConfig・タグは候補版のまま。正式版への更新時はCLIの版とlockfile、公開設定、公開メタデータ検査、README / CHANGELOGを揃え、配布tgz・CIを検証してから公開する。公開後のRegistry検証を省略しない。
