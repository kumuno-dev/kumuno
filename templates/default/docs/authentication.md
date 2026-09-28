# Authentication

Better Auth 1.7.6のPrisma adapter・標準のcredential Account・署名Cookie・DBセッションを使用する。パスワードはAccount.passwordに標準ハッシュで保存する。

## セットアップ

Migrationを適用し、開発Seedを作成する。アプリ直下の.env.localにBETTER_AUTH_URL（例：http://localhost:3000）とBETTER_AUTH_SECRETを設定する。秘密鍵は以下で生成した値を用い、Gitやログへ保存しない。

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

npm run devで起動し、/loginでadmin@example.comとSeed時に指定したパスワードを入力する。ログイン後は/dashboardに進む。localhostと127.0.0.1は別originなのでURLとブラウザーを揃える。ポートを変えたらBETTER_AUTH_URLも変更する。トップページ・ログイン画面の表示とビルドだけならDBは不要。ログイン操作・保護ページにはDBと認証設定が必須。

## 境界とセキュリティ

- 公開HTTP入口はPOST /api/auth/sign-in/emailと/sign-outのみ。サインアップ・ユーザー更新・パスワード変更等は公開しない。管理者による作成は権限工程以降に追加する。
- 固定のBETTER_AUTH_URLをtrusted originとし、POSTのOrigin一致とBetter Auth標準CSRF検査を両方行う。ブラウザーの入力だけで所属や有効状態を変更できない。
- CookieはHttpOnly・SameSite=Lax。HTTPSではSecure。HTTPはループバック開発用originのみ許可する。本番はHTTPSを設定する。
- セッションは8時間。現在の保護ページは参照時に延長せず、有効期限後に再ログインする。Cookieキャッシュを無効にし、毎回DBを確認する。
- requireUserを保護ページ・将来のServer Action/Route Handler入口で呼ぶ。レイアウトやCookieの有無だけで保護しない。ユーザーIDは確認済みセッションから取り出す。必要な権限判定はMilestone 6で追加する。
- getActiveUserは業務上の人物情報だけを返し、セッションtoken・ハッシュを渡さない。HTTP応答も成功/失敗のみ返し、Cookieは標準処理を維持する。
- disableUserはユーザー無効化と既存セッション削除を同じDB transactionで実行する内部関数。管理画面やAPIは未公開。将来の呼出元はRBACと監査を追加する。直接DBでisActiveを変更した場合も次の保護ページ参照で拒否し、残るセッションを削除する。
- ログインと無効化が競合してセッション行が遅れて作成されても、保護処理が最新のisActiveを確認して拒否する。再有効化を管理機能へ追加する際は、残存セッションも削除した上で新規ログインを要求する。
- 認証エラーは一般的なメッセージで返す。URL・パスワード・ハッシュ・Cookie・DB生エラーを通常ログへ出さない。

## 試行制限とデプロイ

Better Auth標準のDB試行制限を使う。RateLimitテーブルでログインは60秒に5回まで。複数プロセス間でも共有する。未設定・不正なIPでは共通バケットへ集約して制限を回避させない。この既定値は小規模ローカル試用向けで、多人数は同じ枠を共有する。

インターネット公開時は、実際のクライアントIPを上書き設定する信頼済みリバースプロキシを用意し、AUTH_TRUSTED_IP_HEADERをそのヘッダー名に設定する。例はx-real-ip。Next.jsへ直接アクセスできないネットワーク構成にし、クライアントが任意の値を通せないことを確認する。単なるX-Forwarded-Forの自己申告は信用しない。分散したIPによる攻撃対策はプロキシ側の追加制限と監視で行う。

DB障害時は認証を許可しない。秘密鍵変更は既存Cookieを無効化するため、計画的に全員の再ログインを行う。TLS終端・複数ホストの実環境検証はリリース前に必要。

## 検証

npm run checkはDB不要の回帰。専用TEST_DATABASE_URLを.env.test.localへ設定し、npm run test:dbとnpm run test:authを実行する。test:authは一意のschemaへMigration・Seedを適用し、本番ビルドと一時ポートのサーバーでPC/スマートフォンのログイン・ログアウト・未認証アクセス・無効化を確認する。終了時にサーバーと作成したschemaを削除する。パスワードを含むtraceや失敗スクリーンショットは保存しない。build/test:e2e/test:authは同じ.nextを使うので並列実行しない。
