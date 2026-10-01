import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
export type AuthConfig = {secret:string;baseURL:string;secureCookies:boolean;ipHeader?:string};
type KumunoOptions = {user:{additionalFields:{
  organizationId:{type:"string";required:true;input:false};
  isActive:{type:"boolean";required:false;defaultValue:true;input:false};
}}};
export type Authentication = ReturnType<typeof betterAuth<KumunoOptions>>;
export type AuthDependencies = {
  database:NonNullable<BetterAuthOptions["database"]>;
  findUserAccess:(userId:string)=>Promise<{isActive:boolean}|null>;
  config:AuthConfig;
};
/** App supplies its adapter and authoritative active-user lookup; KUMUNO never owns its schema. */
export function createKumunoAuthentication(input:AuthDependencies):Authentication;
export function getAuthConfig(env?:Record<string,string|undefined>):AuthConfig;
export function handleAuthentication(request:Request,auth:Pick<Authentication,"handler">,config:AuthConfig):Promise<Response>;
