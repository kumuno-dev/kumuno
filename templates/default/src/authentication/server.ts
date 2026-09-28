import "server-only";
import { getDatabase } from "../database/client";
import { getAuthConfig } from "./config";
import { createAuthentication, type Authentication } from "./factory";
let authentication: Authentication | undefined;
export function getAuthentication() {
  return authentication ??= createAuthentication(getDatabase(), getAuthConfig());
}
