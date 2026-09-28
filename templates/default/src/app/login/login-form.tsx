"use client";
import { useState, type FormEvent } from "react";
export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: String(form.get("email")).trim().toLowerCase(), password: String(form.get("password")) }),
      });
      if (response.ok) { window.location.assign("/dashboard"); return; }
      setError(response.status === 429 ? "試行回数が上限に達しました。しばらく待って再試行してください。" : response.status >= 500 ? "現在ログインできません。時間をおいて再試行してください。" : "メールアドレスまたはパスワードを確認してください。");
    } catch { setError("接続できませんでした。通信状態を確認してください。"); }
    setPending(false);
  }
  return <form onSubmit={submit} className="space-y-5" aria-busy={pending}>
    <div><label htmlFor="email" className="mb-2 block text-sm font-medium">メールアドレス</label>
      <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} className="w-full rounded border border-slate-400 bg-white px-3 py-3" /></div>
    <div><label htmlFor="password" className="mb-2 block text-sm font-medium">パスワード</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} className="w-full rounded border border-slate-400 bg-white px-3 py-3" /></div>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    <button disabled={pending} className="w-full rounded bg-orange-800 px-4 py-3 font-semibold text-white disabled:opacity-60">{pending ? "確認中…" : "ログイン"}</button>
  </form>;
}
