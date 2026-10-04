"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "../authentication/require-user";
import { getAuthConfig } from "../authentication/config";
import { getDatabase } from "../database/client";
import { ForbiddenError } from "../authorization/policy";
import { InputError,field } from "../management/validation";
import { databaseErrorCode } from "../database/errors";
import type { FormState } from "../management/actions";
import { markNotificationRead } from "./service";
export async function notificationReadAction(_state:FormState,form:FormData):Promise<FormState>{
  const actor=await requireUser();
  if((await headers()).get("origin")!==getAuthConfig().baseURL)return {error:"送信元を確認できません。"};
  try{await markNotificationRead(getDatabase(),actor.id,actor.organizationId,field(form,"id",36));}
  catch(error){
    if(error instanceof InputError||error instanceof ForbiddenError)return {error:error.message};
    const code=databaseErrorCode(error);
    if(code==="P2034")return {error:"別の更新と競合しました。再読み込みして再操作してください。"};
    console.error("通知の既読更新に失敗しました。",{code});return {error:"既読にできませんでした。再試行してください。"};
  }
  revalidatePath("/dashboard","layout");return {success:"既読にしました。"};
}
