"use client";
import { useActionState, type ReactNode } from "react";
import type { FormState } from "./actions";
export function ManagementForm({ action, children, label = "保存する" }: {
  action: (state: FormState, form: FormData) => Promise<FormState>; children: ReactNode; label?: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return <form action={submit} className="management-form">
    <fieldset disabled={pending}>{children}</fieldset>
    {state.error && <p role="alert" className="notice-error">{state.error}</p>}
    {state.success && <p role="status" className="notice-success">{state.success}</p>}
    <button className="primary-button" disabled={pending}>{pending ? "保存中…" : label}</button>
  </form>;
}
