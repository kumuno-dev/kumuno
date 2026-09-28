# 0011: Authentication実装

2026-09-29。Milestone 5を実装する。Better Auth 1.7.6の既存依存とPrisma adapterを利用し、新規依存なし。標準のUser/Account/Session/Verificationを維持し、DB共有の試行制限用RateLimitだけを追加する。

Next.js 16.3.6同梱のRoute Handler・headers文書を確認。認証をリクエスト時に初期化し、ビルドはDB・秘密鍵を要求しない。ログイン/ログアウトはブラウザーから同一originのPOSTを使い、Better AuthがCookieを設定する。Next.js Server Action内のCookie連携pluginは不要。

標準セッションは8時間、Cookieキャッシュを無効化。保護ページではセッションに加えてisActiveをDBで確認する。HTTPはログイン/ログアウトに限定し、JSONからtokenと内部エラーを除く。公開サインアップと業務属性のクライアント入力は無効化する。get-session等のHTTP公開はUIが必要になるまで行わない。

試行制限をmemoryにすると複数プロセスで分散するため標準DB storageを採用。信頼済みプロキシ未設定時は偽装ヘッダーを採用せず、共通バケットで制限する。既存0009のUUID・所属必須方針を維持し、Seedが所属付きユーザーを作成する。再有効化や管理APIは権限・監査工程で実装する。

参考：https://better-auth.com/docs/concepts/database 。採用版のinit-options、セッション処理、rate-limiter、IP抽出実装も確認した。RateLimit応答のX-Retry-Afterを標準Retry-Afterにも写す。

実ブラウザー検証でNext.jsのRequestとNode Requestの実装差による構築エラーを検出。URL・method・headers・bodyを明示して標準Requestへ渡す形に修正した。保護ページではheaders()を先にawaitして、ビルド時のDB初期化を防ぐ。
