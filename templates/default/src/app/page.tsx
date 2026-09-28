import Link from "next/link";
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col px-6 py-10 sm:px-12 sm:py-16">
      <p className="text-lg font-bold tracking-tight">KUMUNO</p>

      <section aria-labelledby="welcome-title" className="my-auto py-20 sm:py-28">
        <p className="mb-6 text-sm font-medium tracking-widest text-emerald-800">
          人とAIのための業務システム開発基盤
        </p>
        <h1 id="welcome-title" className="text-4xl leading-relaxed font-bold tracking-tight sm:text-6xl sm:leading-snug">
          社内システムを、<br />AIと作る。
        </h1>
        <p className="mt-8 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
          業務を知っている人が、AIと一緒に、<br className="hidden sm:block" />
          自分たちの仕事に合った仕組みを育てていく。
        </p>
        <p className="mt-10 border-l-2 border-emerald-700 pl-4 text-sm leading-7 text-slate-600">
          現在、開発基盤を準備しています。
          <br />
          業務機能は今後、順次追加していきます。
        </p>
        <Link href="/login" className="mt-8 inline-block rounded bg-orange-800 px-6 py-3 font-semibold text-white">ログインへ</Link>
      </section>

      <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-6 text-xs leading-6 text-slate-600">
        <p>Build business software with your AI coding agent.</p>
        <p>v0.1 · 開発中</p>
      </footer>
    </main>
  );
}
