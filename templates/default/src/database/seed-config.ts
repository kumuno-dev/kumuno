export function getSeedConfig(env: Record<string, string | undefined> = process.env) {
  if (env.NODE_ENV === "production" || env.SEED_ALLOW_DEVELOPMENT !== "true") {
    throw new Error("Seedは開発専用です。SEED_ALLOW_DEVELOPMENT=trueを設定してください。");
  }
  const password = env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error("SEED_ADMIN_PASSWORDは12〜128文字で指定してください。");
  }
  return { password };
}
