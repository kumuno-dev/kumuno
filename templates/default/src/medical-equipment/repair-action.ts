"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../authentication/require-user";
import { getAuthConfig } from "../authentication/config";
import { getDatabase } from "../database/client";
import { InputError } from "../management/validation";
import { ForbiddenError } from "../authorization/policy";
import { databaseErrorCode } from "../database/errors";
import type { FormState } from "../management/actions";
import { saveMedicalRepair } from "./repairs";
export async function medicalRepairAction(_state:FormState,form:FormData):Promise<FormState> {
  const actor = await requireUser();
  if ((await headers()).get("origin") !== getAuthConfig().baseURL) return {error:"送信元を確認できません。"};
  let id:string;
  try {id = await saveMedicalRepair(getDatabase(),actor.id,actor.organizationId,form);}
  catch(error) {
    if (error instanceof InputError || error instanceof ForbiddenError) return {error:error.message};
    const code = databaseErrorCode(error);
    if (code === "P2034") return {error:"別の操作と競合しました。再読み込みして再操作してください。"};
    if (code === "P2002") return {error:"この機器は修理依頼済みです。画面を再読み込みしてください。"};
    if (code === "P2003") return {error:"機器と担当者を確認してください。"};
    console.error("修理記録の保存に失敗しました。",{code});
    return {error:"保存できませんでした。再試行してください。"};
  }
  revalidatePath("/dashboard/medical-equipment");
  revalidatePath("/dashboard/medical-repairs");
  revalidatePath(`/dashboard/medical-equipment/${id}`);
  redirect(`/dashboard/medical-equipment/${id}`);
}
