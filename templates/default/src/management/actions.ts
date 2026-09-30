"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser } from "../authentication/require-user";
import { getAuthConfig } from "../authentication/config";
import { getDatabase } from "../database/client";
import { ForbiddenError } from "../authorization/policy";
import { databaseErrorCode } from "../database/errors";
import { InputError, field } from "./validation";
import { saveUser, saveDepartment, deleteDepartment } from "./service";
export type FormState = { error?: string; success?: string };
async function run(form: FormData, kind: "user" | "department" | "delete"): Promise<FormState> {
  const actor = await requireUser();
  if ((await headers()).get("origin") !== getAuthConfig().baseURL) return { error: "送信元を確認できません。" };
  try {
    if (kind === "user") await saveUser(getDatabase(), actor.id, actor.organizationId, form);
    else if (kind === "department") await saveDepartment(getDatabase(), actor.id, actor.organizationId, form);
    else {
      if (form.get("confirm") !== "yes") throw new InputError("削除の確認にチェックしてください。");
      await deleteDepartment(getDatabase(), actor.id, actor.organizationId, field(form, "id", 36));
    }
  } catch (error) {
    if (error instanceof InputError || error instanceof ForbiddenError) return { error: error.message };
    const code = databaseErrorCode(error);
    if (code === "P2002") return { error: "メールアドレス・コードが既に使われています。" };
    if (code === "P2034") return { error: "別の更新と競合しました。画面を再読み込みして再操作してください。" };
    if (code === "P2003") return { error: "関連するデータがあるため変更できません。" };
    console.error("管理データの保存に失敗しました。", { code });
    return { error: "保存できませんでした。時間をおいて再試行してください。" };
  }
  revalidatePath("/dashboard", "layout");
  return { success: kind === "delete" ? "削除しました。" : "保存しました。" };
}
export async function userAction(_state: FormState, form: FormData) { return run(form, "user"); }
export async function departmentAction(_state: FormState, form: FormData) { return run(form, "department"); }
export async function deleteDepartmentAction(_state: FormState, form: FormData) { return run(form, "delete"); }
