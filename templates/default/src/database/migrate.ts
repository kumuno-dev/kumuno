import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { parseDatabaseUrl } from "./config";

// Use the official CLI for history, locking, and failed-migration recovery.
// Capture its output: it may contain SQL, URLs, or database credentials.
export function runMigrationCommand(
  databaseUrl: string,
  args: string[] = ["deploy"],
  configPath = resolve("prisma.config.ts"),
) {
  parseDatabaseUrl(databaseUrl);
  return new Promise<void>((fulfill, reject) => {
    const child = spawn(process.execPath, [resolve("node_modules/prisma/build/index.js"), "migrate", ...args, "--config", configPath], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const capture = (chunk: Buffer) => { output = (output + chunk.toString()).slice(-32_768); };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) fulfill();
      else reject(Object.assign(new Error("Prisma Migration failed"), { code: output.match(/\bP\d{4}\b/)?.[0] ?? "MIGRATION_FAILED" }));
    });
  });
}

export const migrateDatabase = (url: string, configPath?: string) => runMigrationCommand(url, ["deploy"], configPath);
