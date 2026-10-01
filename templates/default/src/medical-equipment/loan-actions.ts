"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "../authentication/require-user";
import { getAuthConfig } from "../authentication/config";
import { getDatabase } from "../database/client";
import { InputError, field } from "../management/validation";
import { ForbiddenError } from "../authorization/policy";
import { databaseErrorCode } from "../database/errors";
import type { FormState } from "../management/actions";
import { lendMedicalDevice, returnMedicalDevice } from "./loans";
async function run(form: FormData, returning: boolean): Promise<FormState> {
  const actor = await requireUser();
  if ((await headers()).get("origin") !== getAuthConfig().baseURL) return {error:"送信元を確認できません。"};
  let id: string;
  try {
    if (returning && form.get("confirm") !== "yes") throw new InputError("返却の確認にチェックしてください。");
    id = returning ? await returnMedicalDevice(getDatabase(),actor.id,actor.organizationId,field(form,"loanId",36)) : await lendMedicalDevice(getDatabase(),actor.id,actor.organizationId,form);
  } catch (error) {
    if (error instanceof InputError || error instanceof ForbiddenError) return {error:error.message};
    const code = databaseErrorCode(error);
    if (code === "P2002") return {error:"この機器はすでに貸出中です。再読み込みしてください。"};
    if (code === "P2034") return {error:"別の更新と競合しました。再読み込みして再操作してください。"};
    if (code === "P2003") return {error:"機器・貸出先・担当者を確認してください。"};
    console.error("貸出・返却の保存に失敗しました。",{code});
    return {error:"保存できませんでした。再試行してください。"};
  }
  revalidatePath("/dashboard/medical-equipment");
  revalidatePath("/dashboard/medical-loans");
  revalidatePath(`/dashboard/medical-equipment/${id}`);
  redirect(`/dashboard/medical-equipment/${id}`);
}
export async function lendMedicalDeviceAction(_state: FormState, form: FormData) {return run(form,false);}
export async function returnMedicalDeviceAction(_state: FormState, form: FormData) {return run(form,true);}
