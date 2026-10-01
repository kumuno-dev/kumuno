import type { Prisma } from "../generated/prisma/client";
export const availabilityLabels = {ready:"貸出可能",loaned:"貸出中",pending:"点検待ち",repair:"修理中",suspended:"運用停止",retired:"廃棄済み"};
export type Availability = keyof typeof availabilityLabels;
export function medicalAvailabilityWhere(value:Availability):Prisma.MedicalDeviceWhereInput {
  const noRepair = {repairs:{none:{status:{not:"COMPLETED" as const}}}}, noLoan = {loans:{none:{returnedAt:null}}};
  if (value === "retired") return {status:"RETIRED"};
  if (value === "repair") return {status:{not:"RETIRED"},repairs:{some:{status:{not:"COMPLETED"}}}};
  if (value === "loaned") return {status:{not:"RETIRED"},...noRepair,loans:{some:{returnedAt:null}}};
  if (value === "pending") return {status:{not:"RETIRED"},...noRepair,...noLoan,returnInspectionPending:true};
  return {status:value === "ready" ? "IN_SERVICE" : "SUSPENDED",...noRepair,...noLoan,returnInspectionPending:false};
}
