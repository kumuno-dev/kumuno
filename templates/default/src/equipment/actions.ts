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
import { saveEquipment, deleteEquipment } from "./service";
async function run(form: FormData, remove: boolean): Promise<FormState> {
  const actor = await requireUser();
  if ((await headers()).get("origin") !== getAuthConfig().baseURL) return { error: "送信元を確認できません。" };
  let id: string | undefined;
  try {
    if (remove) {
      if (form.get("confirm") !== "yes") throw new InputError("削除の確認にチェックしてください。");
      await deleteEquipment(getDatabase(), actor.id, actor.organizationId, field(form,"id",36));
    } else id = await saveEquipment(getDatabase(), actor.id, actor.organizationId, form);
  } catch (error) {
    if (error instanceof InputError || error instanceof ForbiddenError) return { error: error.message };
    const code = databaseErrorCode(error);
    if (code === "P2034") return { error: "別の更新と競合しました。再読み込みして再操作してください。" };
    if (code === "P2003") return { error: "関連する部署・担当者を確認してください。" };
    console.error("備品の保存に失敗しました。", { code });
    return { error: "保存できませんでした。再試行してください。" };
  }
  revalidatePath("/dashboard/equipment", "layout");
  redirect(remove ? "/dashboard/equipment" : `/dashboard/equipment/${id}`);
}
export async function equipmentAction(_state: FormState, form: FormData) { return run(form,false); }
export async function deleteEquipmentAction(_state: FormState, form: FormData) { return run(form,true); }
