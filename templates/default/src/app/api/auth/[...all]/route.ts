import { getAuthentication } from "@/authentication/server";
import { getAuthConfig } from "@/authentication/config";
import { handleAuthentication } from "@/authentication/handler";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try { return await handleAuthentication(request, getAuthentication(), getAuthConfig()); }
  catch {
    console.error("認証サービスを利用できません。接続と設定を確認してください。");
    return Response.json({ error: "認証サービスを利用できません。" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
