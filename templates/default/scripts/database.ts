import { getDatabaseConfig } from "../src/database/config";
import { createDatabaseConnection } from "../src/database/connection";
import { databaseErrorMessage } from "../src/database/errors";
import { migrateDatabase } from "../src/database/migrate";

async function main() {
  const config = getDatabaseConfig();
  if (process.argv[2] === "migrate") {
    await migrateDatabase(config.connectionString);
    console.log("Migrationの適用が完了しました。");
    return;
  }
  if (process.argv[2] !== "check") throw new Error("Use db:check or db:migrate.");
  const connection = createDatabaseConnection(config);
  try {
    await connection.db.$queryRaw`SELECT 1`;
    console.log("PostgreSQLに接続できました。");
  } finally { await connection.close(); }
}

main().catch((error: unknown) => {
  console.error(databaseErrorMessage(error));
  process.exitCode = 1;
});
