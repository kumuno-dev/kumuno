import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold text-emerald-800">404</p>
      <h1 className="mt-4 text-2xl leading-relaxed font-bold">ページが見つかりません</h1>
      <p className="mt-4 leading-7 text-slate-600">URLを確認するか、トップページへお戻りください。</p>
      <Link href="/" className="mt-8 w-fit rounded-sm py-2 text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800">
        トップページへ戻る
      </Link>
    </main>
  );
}
