"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "../authentication/require-user";
import { getAuthConfig } from "../authentication/config";
import { getDatabase } from "../database/client";
import { ForbiddenError } from "../authorization/policy";
import { InputError } from "../management/validation";
import { databaseErrorCode } from "../database/errors";
import { importMaxBytes, previewMedicalImport, issueImportToken, importMedicalDevices, type ImportPreview } from "./csv-import";
export type ImportState={error?:string;success?:string;preview?:ImportPreview;csv?:string;token?:string};
export async function medicalImportAction(_state:ImportState,form:FormData):Promise<ImportState>{
  const actor=await requireUser(),config=getAuthConfig();
  if((await headers()).get("origin")!==config.baseURL)return {error:"送信元を確認できません。"};
  try{
    if(form.get("operation")==="confirm"){
      if(form.get("confirm")!=="yes")throw new InputError("登録内容を確認するチェックを入れてください。");
      const csv=form.get("csv"),token=form.get("token");
      if(typeof csv!=="string"||typeof token!=="string"||csv.length>180000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(csv))throw new InputError("CSVを再確認してください。");
      const decoded=new TextDecoder("utf-8",{fatal:true}).decode(Buffer.from(csv,"base64"));
      const count=await importMedicalDevices(getDatabase(),actor.id,actor.organizationId,decoded,token,config.secret);
      revalidatePath("/dashboard/medical-equipment");revalidatePath("/dashboard/medical-overview");revalidatePath("/dashboard","layout");
      return {success:`${count}台を登録しました。取込後は点検待ちです。合格点検後に貸出できます。`};
    }
    const file=form.get("file");
    if(!(file instanceof File)||!file.size||file.size>importMaxBytes)throw new InputError("UTF-8 CSVを選んでください。上限は128KiB・100台です。");
    let csv:string;try{csv=new TextDecoder("utf-8",{fatal:true}).decode(await file.arrayBuffer());}catch{throw new InputError("UTF-8のCSVとして保存し直してください。");}
    const preview=await previewMedicalImport(getDatabase(),actor.id,actor.organizationId,csv);
    return {preview,csv:Buffer.from(csv,"utf8").toString("base64"),token:preview.errors.length?undefined:issueImportToken(config.secret,actor.id,actor.organizationId,preview.digest)};
  }catch(error){
    if(error instanceof InputError||error instanceof ForbiddenError)return {error:error.message};
    const code=databaseErrorCode(error);
    if(["P2002","P2034","P2003"].includes(code))return {error:"台帳や部署の更新と競合しました。何も登録せず取り消しました。CSVを再確認してください。"};
    console.error("医療CSV取込に失敗しました。",{code});return {error:"登録できませんでした。全体を取り消しました。再試行してください。"};
  }
}
