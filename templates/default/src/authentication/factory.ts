import { createKumunoAuthentication } from "@kumuno/auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { PrismaClient } from "../generated/prisma/client";
import type { AuthConfig } from "./config";
export function createAuthentication(db:PrismaClient,config:AuthConfig) {
  return createKumunoAuthentication({database:prismaAdapter(db,{provider:"postgresql"}),config,
    findUserAccess:userId=>db.user.findUnique({where:{id:userId},select:{isActive:true}})});
}
export type Authentication = ReturnType<typeof createAuthentication>;
