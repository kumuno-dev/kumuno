import type { PrismaClient } from "../generated/prisma/client";
export function unreadNotificationCount(db:PrismaClient,organizationId:string,recipientId:string){
  return db.notification.count({where:{organizationId,recipientId,readAt:null}});
}
export async function notificationList(db:PrismaClient,organizationId:string,recipientId:string,unreadOnly:boolean,requestedPage:number){
  return db.$transaction(async tx=>{
    const scope={organizationId,recipientId};
    const where={...scope,...(unreadOnly?{readAt:null}:{})};
    const total=await tx.notification.count({where}),unread=await tx.notification.count({where:{...scope,readAt:null}});
    const pages=Math.max(1,Math.ceil(total/20)),page=Math.max(1,Math.min(pages,requestedPage));
    const rows=await tx.notification.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],take:20,skip:(page-1)*20});
    return {rows,total,unread,page,pages};
  },{isolationLevel:"RepeatableRead"});
}
