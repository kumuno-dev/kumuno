import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../generated/prisma/client";
import { appendAuditLog } from "../audit/log";
import { requireTransactionActor } from "../authorization/transaction-actor";
import { assertPermission } from "../authorization/policy";
import { InputError, identifier, parseDepartment, parseUser } from "./validation";

export async function saveUser(db: PrismaClient, actorId: string, organizationId: string, form: FormData) {
  const { id, password, ...data } = parseUser(form);
  return db.$transaction(async tx => {
    const actor = await requireTransactionActor(tx, actorId, "users:manage", organizationId);
    const before = id ? await tx.user.findFirst({ where: { id, organizationId } }) : null;
    if (id && !before) throw new InputError("対象が見つかりません。");
    if (data.departmentId && !await tx.department.findFirst({ where: { id: data.departmentId, organizationId } })) throw new InputError("所属部署を確認してください。");
    if (!before || before.role !== data.role) assertPermission(actor, "roles:assign", { organizationId });
    if (id === actorId && (!data.isActive || data.role !== actor.role)) throw new InputError("自分自身の無効化・ロール変更はできません。");
    if (before?.isActive && before.role === "ADMIN" && (!data.isActive || data.role !== "ADMIN")) {
      if (await tx.user.count({ where: { organizationId, role: "ADMIN", isActive: true } }) <= 1) throw new InputError("有効な管理者を1名以上残してください。");
    }
    const emailChanged = before && before.email !== data.email;
    const after = before ? await tx.user.update({ where: { id }, data: { ...data, ...(emailChanged ? { emailVerified: false } : {}) } }) :
      await tx.user.create({ data: { ...data, organizationId } });
    if (!before) {
      await tx.account.create({ data: { userId: after.id, accountId: after.id, providerId: "credential", password: await hashPassword(password!) } });
    } else if (emailChanged || before.role !== data.role || before.isActive !== data.isActive) {
      await tx.session.deleteMany({ where: { userId: after.id } });
    }
    await appendAuditLog(tx, actor, { action: before ? "UPDATE" : "CREATE", resourceType: "User", resourceId: after.id, before: before ?? undefined, after });
    return after.id;
  }, { isolationLevel: "Serializable", timeout: 15000 });
}

export async function saveDepartment(db: PrismaClient, actorId: string, organizationId: string, form: FormData) {
  const { id, ...data } = parseDepartment(form);
  return db.$transaction(async tx => {
    const actor = await requireTransactionActor(tx, actorId, "departments:manage", organizationId);
    const before = id ? await tx.department.findFirst({ where: { id, organizationId } }) : null;
    if (id && !before) throw new InputError("対象が見つかりません。");
    const departments = await tx.department.findMany({ where: { organizationId }, select: { id: true, parentId: true } });
    const parents = new Map(departments.map(d => [d.id, d.parentId]));
    if (data.parentId && !parents.has(data.parentId)) throw new InputError("親部署を確認してください。");
    const visited = new Set(id ? [id] : []);
    let current = data.parentId;
    while (current) {
      if (visited.has(current)) throw new InputError("部署の循環参照は作成できません。");
      visited.add(current); current = parents.get(current) ?? null;
    }
    const after = before ? await tx.department.update({ where: { id }, data }) : await tx.department.create({ data: { ...data, organizationId } });
    await appendAuditLog(tx, actor, { action: before ? "UPDATE" : "CREATE", resourceType: "Department", resourceId: after.id, before: before ?? undefined, after });
    return after.id;
  }, { isolationLevel: "Serializable" });
}

export async function deleteDepartment(db: PrismaClient, actorId: string, organizationId: string, id: string) {
  identifier(id);
  return db.$transaction(async tx => {
    const actor = await requireTransactionActor(tx, actorId, "departments:manage", organizationId);
    const before = await tx.department.findFirst({ where: { id, organizationId } });
    if (!before) throw new InputError("対象が見つかりません。");
    if (await tx.user.count({ where: { departmentId: id } }) || await tx.department.count({ where: { parentId: id } })) throw new InputError("所属ユーザーまたは子部署があるため削除できません。");
    await tx.department.delete({ where: { id } });
    await appendAuditLog(tx, actor, { action: "DELETE", resourceType: "Department", resourceId: id, before });
  }, { isolationLevel: "Serializable" });
}
