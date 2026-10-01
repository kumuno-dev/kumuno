"use server";
import { headers,cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "../authentication/require-user";
import { getAuthConfig } from "../authentication/config";
import { can,ForbiddenError } from "../authorization/policy";
import { getDatabase } from "../database/client";
import { InputError } from "../management/validation";
import { databaseErrorCode } from "../database/errors";
import type { FormState } from "../management/actions";
import { createMedicalSamples } from "./samples";
import { sampleCookie } from "./sample-preference";
export async function medicalSampleAction(_state:FormState,form:FormData):Promise<FormState> {
  const actor = await requireUser(), config = getAuthConfig();
  if ((await headers()).get("origin") !== config.baseURL) return {error:"送信元を確認できません。"};
  const mode = form.get("sampleMode");
  if (mode !== "include" && mode !== "exclude") return {error:"表示するデータを選択してください。"};
  try {
    if (mode === "include" && can(actor,"medical-equipment:manage",actor)) await createMedicalSamples(getDatabase(),actor.id,actor.organizationId);
  } catch(error) {
    if (error instanceof InputError || error instanceof ForbiddenError) return {error:error.message};
    const code = databaseErrorCode(error);
    if (code === "P2034" || code === "P2002") return {error:"競合またはテスト用管理番号の重複があります。再読み込みして番号を確認してください。"};
    console.error("テストデータの準備に失敗しました。",{code});
    return {error:"テストデータを準備できませんでした。既存データは保持されています。"};
  }
  (await cookies()).set(sampleCookie,mode === "include" ? actor.organizationId : "off",{httpOnly:true,sameSite:"lax",secure:new URL(config.baseURL).protocol === "https:",path:"/",maxAge:60*60*24*30});
  revalidatePath("/dashboard","layout");
  return {success:mode === "include" ? "テストデータありに切り替えました。" : "テストデータなしに切り替えました。データは削除していません。"};
}
