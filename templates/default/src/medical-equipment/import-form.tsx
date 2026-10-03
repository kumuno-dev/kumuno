"use client";
import { useActionState } from "react";
import { medicalImportAction, type ImportState } from "./import-actions";
export function MedicalImportForm(){
  const [state,action,pending]=useActionState<ImportState,FormData>(medicalImportAction,{});
  return <><form action={action} className="management-form panel"><fieldset disabled={pending}><input type="hidden" name="operation" value="preview"/><label>取込CSV<input type="file" name="file" accept=".csv,text/csv" required aria-describedby="import-help"/></label><p id="import-help">UTF-8、128KiB以内、100台まで。必須列は機器管理番号・機器名・種別です。部署は既存の部署コードで指定できます。</p><button className="primary-button mt-6">{pending?"確認中…":"登録前に内容を確認"}</button></fieldset></form>
    {state.error&&<p role="alert" className="notice-error mt-6">{state.error}</p>}{state.success&&<p role="status" className="notice-success mt-6">{state.success}</p>}
    {state.preview&&<section className="panel mt-6"><h2>取込内容の確認（{state.preview.rows.length}台）</h2><p>まだ登録していません。全行を確認してください。既存台帳の上書き・貸出履歴の取込・部署の自動作成は行いません。</p>
    {state.preview.errors.length>0&&<div role="alert" className="notice-error"><p>修正してCSVを選び直してください。</p><ul>{state.preview.errors.map((error,i)=><li key={i}>{error}</li>)}</ul></div>}
    <div className="record-list mt-6">{state.preview.rows.map((row,i)=><article className="record" key={i}><h3>{i+2}行目</h3><dl className="form-grid">{state.preview?.headers.map((header,j)=><div key={header}><dt>{header}</dt><dd className="break-words whitespace-pre-wrap">{row[j]||"未設定"}</dd></div>)}</dl></article>)}</div>
    {state.token&&<form action={action} className="management-form mt-6"><fieldset disabled={pending}><input type="hidden" name="operation" value="confirm"/><input type="hidden" name="csv" value={state.csv}/><input type="hidden" name="token" value={state.token}/><div className="flex gap-3 items-start"><input id="medical-import-confirm" className="mt-1 shrink-0" type="checkbox" name="confirm" value="yes" required/><label htmlFor="medical-import-confirm">全件の登録内容と、取込後は点検待ちになることを確認しました</label></div><button className="primary-button mt-6">{pending?"登録中…":"確認した内容を一括登録"}</button></fieldset></form>}</section>}</>;
}
