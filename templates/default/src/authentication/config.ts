export function getAuthConfig(env: Record<string, string | undefined> = process.env) {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32 || secret.includes("REPLACE")) throw new Error("BETTER_AUTH_SECRETに32文字以上のランダムな値を設定してください。");
  let url: URL;
  try { url = new URL(env.BETTER_AUTH_URL ?? ""); } catch { throw new Error("BETTER_AUTH_URLにアプリのoriginを指定してください。"); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      !["http:", "https:"].includes(url.protocol) ||
      (url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
    throw new Error("BETTER_AUTH_URLはHTTPSのorigin（ローカルのみHTTP可）にしてください。");
  }
  const ipHeader = env.AUTH_TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (ipHeader && !/^[a-z0-9-]+$/.test(ipHeader)) throw new Error("AUTH_TRUSTED_IP_HEADERが不正です。");
  return { secret, baseURL: url.origin, secureCookies: url.protocol === "https:", ipHeader };
}
export type AuthConfig = ReturnType<typeof getAuthConfig>;
