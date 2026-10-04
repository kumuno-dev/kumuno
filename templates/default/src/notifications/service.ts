import { publishNotification,type NotificationEvent,type NotificationPrincipal } from "@kumuno/notifications";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import { appendAuditLog } from "../audit/log";
import { requireTransactionActor } from "../authorization/transaction-actor";
import { InputError,identifier } from "../management/validation";
// Internal: the caller supplies the current actor from its authorized transaction.
export async function saveNotification(tx:Prisma.TransactionClient,actor:NotificationPrincipal,recipient:NotificationPrincipal,event:NotificationEvent){
  return publishNotification(async entry=>{
    const notification=await tx.notification.create({data:entry});
    await appendAuditLog(tx,actor,{action:"CREATE",resourceType:"Notification",resourceId:notification.id,after:notification});
    return notification.id;
  },actor,recipient,event);
}
export async function markNotificationRead(db:PrismaClient,actorId:string,organizationId:string,id:string){
  identifier(id);
  return db.$transaction(async tx=>{
    const actor=await requireTransactionActor(tx,actorId,"dashboard:read",organizationId);
    const before=await tx.notification.findFirst({where:{id,organizationId,recipientId:actor.id}});
    if(!before)throw new InputError("通知が見つかりません。");
    if(before.readAt)return;
    // Conditional update locks the row and preserves the first readAt. Serializable
    // transactions reject a concurrent stale read rather than duplicating its audit.
    const changed=await tx.notification.updateMany({where:{id,organizationId,recipientId:actor.id,readAt:null},data:{readAt:new Date()}});
    if(!changed.count)return;
    const after=await tx.notification.findUniqueOrThrow({where:{id}});
    await appendAuditLog(tx,actor,{action:"UPDATE",resourceType:"Notification",resourceId:id,before,after});
  },{isolationLevel:"Serializable"});
}
