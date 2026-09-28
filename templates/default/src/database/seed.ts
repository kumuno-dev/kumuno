import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../generated/prisma/client";
import { getSeedConfig } from "./seed-config";

// This development fixture is deliberately separate from production provisioning.
export async function seedDevelopment(db: PrismaClient, env: Record<string, string | undefined> = process.env) {
  const { password } = getSeedConfig(env);
  const hash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    const organization = await tx.organization.upsert({
      where: { code: "kumuno-demo" }, update: {},
      create: { code: "kumuno-demo", name: "KUMUNO サンプル組織" },
    });
    const root = await tx.department.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: "head-office" } },
      update: {}, create: { organizationId: organization.id, code: "head-office", name: "本部" },
    });
    const department = await tx.department.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: "administration" } },
      update: {}, create: { organizationId: organization.id, parentId: root.id, code: "administration", name: "総務部" },
    });
    const email = "admin@example.com";
    const existing = await tx.user.findUnique({ where: { email }, include: { accounts: true } });
    if (existing) {
      if (existing.organizationId !== organization.id || !existing.accounts.some(account =>
        account.providerId === "credential" && account.accountId === existing.id && account.password)) {
        throw new Error("Seedのユーザーが既存データと競合しています。");
      }
      return { organizationId: organization.id, userId: existing.id, created: false };
    }
    const user = await tx.user.create({ data: {
      organizationId: organization.id, departmentId: department.id,
      role: "ADMIN", employeeCode: "DEMO-001", name: "開発用管理者", email,
    } });
    await tx.account.create({ data: { userId: user.id, accountId: user.id, providerId: "credential", password: hash } });
    return { organizationId: organization.id, userId: user.id, created: true };
  }, { isolationLevel: "Serializable" });
}
