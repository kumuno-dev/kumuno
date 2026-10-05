# @kumuno/admin

React 19の共通管理UI。MIT、Node.js 24.x / ESM、npm未公開。`npm run build:admin`で作ったvendorの実tgzを別アプリへコピーし、npm installできる。

```tsx
import {UserFields,DepartmentFields} from "@kumuno/admin";
import {ManagementForm} from "@kumuno/admin/form";
<ManagementForm action={userAction} label="登録する">
  <UserFields departments={authorizedDepartments}/>
</ManagementForm>
```

root exportはユーザー・部署の入力欄、`/form`はuse clientを維持した送信フォーム。送信中の入力/ボタン無効化、成功・エラーの案内、ラベルと文字数の補助を提供する。Reactはpeer dependencyで利用アプリのReactを共有する。Next.js・Prisma・Better Authには依存しない。

提供側が認証済み操作者と組織でデータを絞り、表示/編集可否と最新権限を検査する。actionにはNext.js Server Actionなど対応するReact Actionを渡し、サーバーで再検証・同一transactionの保存と監査を行う。画面を隠すことは認可ではない。パッケージはDB取得や権限付与をしない。

ユーザーの既存値は明示的な表示属性のみ。新規登録にだけ初期パスワード欄を表示し、ハッシュ・既存パスワードは渡さない。複数の新規UserFieldsを同時表示する場合は固有のpasswordHelpIdを指定する。親部署の自部署除外は入力補助で、循環・越境・削除可否はサーバーで検査する。

CSSは同梱しない。生成アプリはform-grid / management-form / primary-button / notice-error / notice-successと既存CSSを使う。全管理ページの自動生成・汎用マスタCRUD・独自権限編集・API公開は未実装。
