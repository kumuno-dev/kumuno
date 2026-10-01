# create-kumunoの公開手順

この文書はメンテナー向けです。現在の候補はcreate-kumuno@0.1.0-rc.0、MIT、npmのnextタグです。まだnpmへ公開していません。rootと生成アプリはprivate: trueを維持し、CLIだけを公開可能にしています。

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

このMacのnpmログインは2026-10-01に確認済みです。ただしアカウントの2FAが無効で、初回公開はnpmから403で拒否されました。メンテナー本人がnpmのAccount → Two-Factor Authentication → Enable 2FAで設定します。[公式設定手順](https://docs.npmjs.com/configuring-two-factor-authentication/)を参照してください。メンテナー本人がnpmへログインし、公開するアカウントを確認します。パスワード・OTP・トークンをチャットやGitへ貼り付けません。

```sh
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
```

GitHubは2026-10-01にユーザー承認によりpublicへ切り替えました。[非公開脆弱性報告](../SECURITY.md)も有効です。候補版のnpm公開も承認済みで、現在は2FA設定待ちです。公開操作時にはnpmが要求するブラウザーやOTPの本人確認を完了します。

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

候補版はnextタグを使い、latestへ切り替えません。公開後にnpm viewで版・タグ・dist.integrityを確認し、別のディレクトリでRegistry経由の生成・check・DB検証を行います。

```sh
npm view create-kumuno@next version dist.integrity --registry=https://registry.npmjs.org/
npx --yes create-kumuno@next registry-trial --install
```

正式版0.1.0とlatestへの公開はMilestone 15のAcceptance Test A〜GとRelease Candidate確認の後に判断します。Git tag / GitHub Release / LPの公開状態も、実際の公開結果に合わせて更新します。

## 自動公開

通常CIは公開しません。初回は上記の手動認証・確認で進めます。後でTrusted Publishingを設定する場合はnpm側のパッケージ設定とGitHub workflowの対応を確認します。privateリポジトリではprovenanceが生成されないため、この状態でprovenance付き公開を約束しません。

参考: [npm publish](https://docs.npmjs.com/cli/commands/npm-publish/)、[package.json / publishConfig](https://docs.npmjs.com/cli/configuring-npm/package-json/)、[Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。
