import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "../database/client";
import { getAuthentication } from "./server";
import { getActiveUser } from "./session";
export async function requireUser() {
  const requestHeaders = await headers();
  let user;
  try { user = await getActiveUser(getAuthentication(), getDatabase(), requestHeaders); }
  catch {
    console.error("セッション確認に失敗しました。接続と認証設定を確認してください。");
    throw new Error("認証サービスを利用できません。");
  }
  if (!user) redirect("/login");
  return user;
}
