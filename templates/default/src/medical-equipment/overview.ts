import type { PrismaClient } from "../generated/prisma/client";
import { availabilityLabels,medicalAvailabilityWhere,type Availability } from "./availability";
import { todayInJapan } from "./inspections";
export async function medicalOverview(db:PrismaClient,organizationId:string,includeSamples:boolean) {
  const scope = {organizationId,isSample:includeSamples ? undefined : false};
  return db.$transaction(async tx=>{
    const total = await tx.medicalDevice.count({where:scope});
    const counts = {} as Record<Availability,number>;
    for (const key of Object.keys(availabilityLabels) as Availability[]) counts[key] = await tx.medicalDevice.count({where:{...scope,AND:medicalAvailabilityWhere(key)}});
    const today = todayInJapan(), soon = new Date(new Date(today).getTime()+7*86400000).toISOString().slice(0,10);
    // A newer inspection supersedes an older next-date, including when it clears that date.
    const devices = await tx.medicalDevice.findMany({where:{...scope,status:{not:"RETIRED"},inspections:{some:{}}},select:{id:true,name:true,managementNumber:true,inspections:{take:1,orderBy:[{recordedAt:"desc"},{id:"asc"}],select:{nextInspectionDate:true,result:true}}}});
    const upcoming = devices.flatMap(d=>{
      const next = d.inspections[0]?.nextInspectionDate?.toISOString().slice(0,10);
      return next && next <= soon ? [{id:d.id,name:d.name,managementNumber:d.managementNumber,next,result:d.inspections[0].result,overdue:next<today}] : [];
    }).sort((a,b)=>a.next.localeCompare(b.next)||a.managementNumber.localeCompare(b.managementNumber)||a.id.localeCompare(b.id));
    return {total,counts,today,soon,dueTotal:upcoming.length,overdue:upcoming.filter(d=>d.overdue).length,upcoming:upcoming.slice(0,5)};
  },{isolationLevel:"RepeatableRead"});
}
