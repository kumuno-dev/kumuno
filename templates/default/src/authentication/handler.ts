import { isIP } from "node:net";
import type { Authentication } from "./factory";
import type { AuthConfig } from "./config";

// Expose only the endpoints supported by this milestone. Better Auth owns
// credential verification, CSRF checks, cookie signing and session persistence.
export async function handleAuthentication(request: Request, auth: Authentication, config: AuthConfig) {
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
