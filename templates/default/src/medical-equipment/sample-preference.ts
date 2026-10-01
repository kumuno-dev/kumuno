import "server-only";
import { cookies } from "next/headers";
export const sampleCookie = "kumuno-medical-samples";
export async function includeMedicalSamples(organizationId:string) {
  return (await cookies()).get(sampleCookie)?.value === organizationId;
}
