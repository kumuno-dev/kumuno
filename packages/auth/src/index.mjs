import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";

export function createKumunoAuthentication({database,findUserAccess,config}) {
  return betterAuth({
    appName: "KUMUNO", baseURL: config.baseURL, secret: config.secret,
    database: database,
    trustedOrigins: [config.baseURL],
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 128 },
    user: { additionalFields: {
      organizationId: { type: "string", required: true, input: false },
      isActive: { type: "boolean", required: false, defaultValue: true, input: false },
    } },
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60, cookieCache: { enabled: false } },
    advanced: {
      database: { generateId: "uuid" }, useSecureCookies: config.secureCookies,
      ipAddress: { ipAddressHeaders: ["x-kumuno-client-ip"] },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 100,
      customRules: { "/sign-in/email": { window: 60, max: 5 } } },
    databaseHooks: { session: { create: { before: async (session) => {
      const user = await findUserAccess(session.userId);
      if (!user?.isActive) throw new APIError("UNAUTHORIZED", { message: "Invalid credentials" });
    } } } },
    logger: { level: "error", log: () => console.error("認証処理でエラーが発生しました。") },
  });
}


export function getAuthConfig(env = process.env) {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32 || secret.includes("REPLACE")) throw new Error("BETTER_AUTH_SECRETに32文字以上のランダムな値を設定してください。");
  let url;
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


import { isIP } from "node:net";

// Expose only the endpoints supported by this milestone. Better Auth owns
// credential verification, CSRF checks, cookie signing and session persistence.
export async function handleAuthentication(request, auth, config) {
  const path = new URL(request.url).pathname;
  if (request.method !== "POST" || !["/api/auth/sign-in/email", "/api/auth/sign-out"].includes(path)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (request.headers.get("origin") !== config.baseURL) return Response.json({ error: "Forbidden" }, { status: 403 });
  const headers = new Headers(request.headers);
  const ip = config.ipHeader ? request.headers.get(config.ipHeader) : null;
  // Unconfigured/invalid proxy IPs share a bucket instead of bypassing limits.
  headers.set("x-kumuno-client-ip", ip && isIP(ip) ? ip : "127.0.0.1");
  // Construct from URL/body explicitly: Next.js Request may use a different
  // implementation from the Node Request constructor in the server bundle.
  const body = await request.text();
  if (body.length > 8192) return Response.json({ error: "Request too large" }, { status: 413 });
  const response = await auth.handler(new Request(request.url, { method: "POST", headers, body }));
  const outputHeaders = new Headers(response.headers);
  outputHeaders.delete("content-length");
  const retryAfter = outputHeaders.get("x-retry-after");
  if (retryAfter) outputHeaders.set("retry-after", retryAfter);
  outputHeaders.set("cache-control", "no-store");
  outputHeaders.set("content-type", "application/json");
  // Keep Set-Cookie and Retry-After, but never send tokens or raw errors in JSON.
  return new Response(JSON.stringify(response.ok ? { success: true } : { error: "認証に失敗しました。" }), {
    status: response.status, headers: outputHeaders,
  });
}
