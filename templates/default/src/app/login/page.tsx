import { LoginForm } from "./login-form";
export default function LoginPage() {
  return <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 py-12">
    <p className="mb-8 text-xl font-bold">KUMUNO</p>
    <h1 className="text-3xl font-bold">ログイン</h1>
    <p className="mt-3 mb-8 text-sm leading-6 text-slate-600">管理者から案内されたメールアドレスとパスワードでログインしてください。</p>
    <LoginForm />
  </main>;
}
