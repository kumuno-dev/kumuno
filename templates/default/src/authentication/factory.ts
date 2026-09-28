import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import type { PrismaClient } from "../generated/prisma/client";
import type { AuthConfig } from "./config";

export function createAuthentication(db: PrismaClient, config: AuthConfig) {
  return betterAuth({
    appName: "KUMUNO", baseURL: config.baseURL, secret: config.secret,
    database: prismaAdapter(db, { provider: "postgresql" }),
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
      const user = await db.user.findUnique({ where: { id: session.userId }, select: { isActive: true } });
      if (!user?.isActive) throw new APIError("UNAUTHORIZED", { message: "Invalid credentials" });
    } } } },
    logger: { level: "error", log: () => console.error("認証処理でエラーが発生しました。") },
  });
}
export type Authentication = ReturnType<typeof createAuthentication>;
