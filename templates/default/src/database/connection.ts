import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";
import { getDatabaseConfig } from "./config";
import { databaseErrorCode } from "./errors";

export function createDatabaseConnection(config: ReturnType<typeof getDatabaseConfig>) {
  const url = new URL(config.connectionString);
  const schema = url.searchParams.get("schema") ?? "public";
  url.searchParams.delete("schema");
  const pool = new Pool({ ...config, connectionString: url.toString() });
  pool.on("error", (error) => {
    console.error("PostgreSQLの待機接続でエラーが発生しました。", { code: databaseErrorCode(error) });
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }), log: [] });
  return {
    pool, db,
    async close() {
      try { await db.$disconnect(); } finally { await pool.end(); }
    },
  };
}
