"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "../authentication/require-user";
import { getAuthConfig } from "../authentication/config";
import { getDatabase } from "../database/client";
import { InputError } from "../management/validation";
import { ForbiddenError } from "../authorization/policy";
import { databaseErrorCode } from "../database/errors";
import type { FormState } from "../management/actions";
import { saveMedicalDevice } from "./service";
export async function medicalDeviceAction(_state: FormState, form: FormData): Promise<FormState> {
  const actor = await requireUser();
  if ((await headers()).get("origin") !== getAuthConfig().baseURL) return { error: "送信元を確認できません。" };
  let id: string;
  try { id = await saveMedicalDevice(getDatabase(),actor.id,actor.organizationId,form); }
  catch (error) {
    if (error instanceof InputError || error instanceof ForbiddenError) return { error: error.message };
    const code = databaseErrorCode(error);
    if (code === "P2002") return { error: "この機器管理番号は登録済みです。別の番号を入力してください。" };
    if (code === "P2034") return { error: "別の更新と競合しました。再読み込みして再操作してください。" };
    if (code === "P2003") return { error: "所属部署を確認してください。" };
    console.error("医療機器の保存に失敗しました。",{ code });
    return { error: "保存できませんでした。再試行してください。" };
  }
  revalidatePath("/dashboard/medical-equipment");
  revalidatePath(`/dashboard/medical-equipment/${id}`);
  redirect(`/dashboard/medical-equipment/${id}`);
}
