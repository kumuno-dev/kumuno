import "server-only";
import { createDatabaseConnection } from "./connection";
import { getDatabaseConfig } from "./config";

const databaseGlobal = globalThis as typeof globalThis & {
  kumunoDatabase?: ReturnType<typeof createDatabaseConnection>;
};

// Lazy initialization keeps builds DB-independent and HMR from multiplying pools.
export function getDatabase() {
  databaseGlobal.kumunoDatabase ??= createDatabaseConnection(getDatabaseConfig());
  return databaseGlobal.kumunoDatabase.db;
}
