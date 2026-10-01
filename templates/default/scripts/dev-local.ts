import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { writeFile, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { LocalDevelopmentError, assertLocalEnvironment, prepareSettings, localDirectory, localUrl, freePort } from "../src/local-development/config";
import { createDatabaseConnection } from "../src/database/connection";
import { getDatabaseConfig } from "../src/database/config";
import { migrateDatabase } from "../src/database/migrate";
import { seedDevelopment } from "../src/database/seed";

let worker: ChildProcess | undefined, app: ChildProcess | undefined, stopping=false, interrupted=false;
async function stop(child: ChildProcess | undefined) {
  if (!child || child.exitCode!==null || child.signalCode!==null) return;
  const ended=once(child,"exit"); child.kill("SIGTERM");
  const timer=setTimeout(()=>child.kill("SIGKILL"),10000);
  try { await ended; } finally { clearTimeout(timer); }
}
async function main() {
  assertLocalEnvironment();
  if (process.argv.length>2) throw new LocalDevelopmentError("dev:localは引数を受け付けません。");
  const root=process.cwd(), settings=await prepareSettings(root), directory=localDirectory(root);
  const lock=join(directory,"run.lock");
  try { await writeFile(lock,String(process.pid),{flag:"wx",mode:0o600}); }
  catch { throw new LocalDevelopmentError("dev:localが起動中、または前回異常終了しています。停止を確認して.kumuno/local/run.lockだけを除去してください。"); }
  const signal=()=>{interrupted=true;stopping=true;void stop(app).then(()=>stop(worker));};
  process.on("SIGINT",signal); process.on("SIGTERM",signal);
  try {
    await freePort(settings.databasePort); await freePort(settings.appPort);
    console.log("開発用PostgreSQLを準備しています（初回のみDBを作成します）…");
    worker=spawn(process.execPath,["--import","tsx","scripts/local-postgres.ts"],{stdio:["ignore","ignore","ignore","ipc"]});
    const ended=once(worker,"exit").catch(()=>[]);
    await new Promise<void>((fulfill,reject)=>{
      const timeout=setTimeout(()=>reject(new LocalDevelopmentError("DB起動がタイムアウトしました。")),60000);
      worker!.once("message",message=>{clearTimeout(timeout);if ((message as {ready?:boolean}).ready) fulfill();else reject(new LocalDevelopmentError("開発DBを起動できません。依存導入と保存先を確認してください。"));});
      worker!.once("error",()=>{clearTimeout(timeout);reject(new LocalDevelopmentError("開発DBを起動できません。"));});
      worker!.once("exit",()=>{clearTimeout(timeout);reject(new LocalDevelopmentError("開発DBが停止しました。"));});
    });
    if (stopping) return;
    const databaseUrl=localUrl(settings);
    console.log("Migrationと開発用初期管理者を確認しています…");
    await migrateDatabase(databaseUrl);
    const connection=createDatabaseConnection(getDatabaseConfig({DATABASE_URL:databaseUrl}));
    try { await seedDevelopment(connection.db,{NODE_ENV:"development",SEED_ALLOW_DEVELOPMENT:"true",SEED_ADMIN_PASSWORD:settings.adminPassword}); }
    finally { await connection.close(); }
    if (stopping) return;
    console.log(`準備できました。http://127.0.0.1:${settings.appPort}/login\nメール: admin@example.com\n初期パスワード: .kumuno/local/login.txtを開いて確認してください。\n終了: Ctrl+C（DBのデータは次回も保持します）`);
    app=spawn(process.execPath,[resolve("node_modules/next/dist/bin/next"),"dev","--hostname","127.0.0.1","--port",String(settings.appPort)],{stdio:"inherit",env:{...process.env,NODE_ENV:"development",DATABASE_URL:databaseUrl,SHADOW_DATABASE_URL:localUrl(settings,"kumuno_local_shadow"),BETTER_AUTH_URL:`http://127.0.0.1:${settings.appPort}`,BETTER_AUTH_SECRET:settings.authSecret,NEXT_TELEMETRY_DISABLED:"1"}});
    const result=await Promise.race([once(app,"exit").then(([code])=>({app:true,code})),ended.then(()=>({app:false,code:1}))]);
    if (!stopping && (!result.app || result.code!==0)) throw new LocalDevelopmentError("開発サーバーまたはDBが停止しました。");
  } finally {
    stopping=true; await stop(app); await stop(worker);
    process.off("SIGINT",signal);process.off("SIGTERM",signal);
    await unlink(lock);
  }
}
main().catch(error=>{ if (interrupted) return; console.error(error instanceof LocalDevelopmentError ? error.message : "開発用セットアップに失敗しました。DB・設定ファイルを削除せず、READMEを確認してください。"); process.exitCode=1; });
