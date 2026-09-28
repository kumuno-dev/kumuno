import { createDatabaseConnection } from "../src/database/connection";
import { getDatabaseConfig } from "../src/database/config";
import { databaseErrorCode } from "../src/database/errors";
import { getSeedConfig } from "../src/database/seed-config";
import { seedDevelopment } from "../src/database/seed";

async function main() {
  getSeedConfig(); // Reject unsafe invocation before opening a connection.
  const connection = createDatabaseConnection(getDatabaseConfig());
  try {
    const result = await seedDevelopment(connection.db);
    console.log(result.created ? "開発用Seedを作成しました。" : "開発用Seedは作成済みです。既存ユーザーを保持しました。");
  } finally { await connection.close(); }
}
main().catch(error => {
  console.error(`Seedに失敗しました。開発用設定・接続・Migration・データ競合を確認してください。(${databaseErrorCode(error)})`);
  process.exitCode = 1;
});
