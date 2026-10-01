import { existsSync, lstatSync } from "node:fs";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { localDirectory, readPrivate, validateSettings } from "../src/local-development/config";

async function main() {
  // Includes the dependency's temporary initdb password file and all cluster files.
  process.umask(0o077);
  if (!process.send || process.getuid?.()===0) throw new Error("開発用ランナーから一般ユーザーで起動してください。");
  const directory=localDirectory(process.cwd());
  const settings=validateSettings(JSON.parse((await readPrivate(join(directory,"settings.json"))) ?? "null"));
  const databaseDir=join(directory,"postgres");
  if (existsSync(databaseDir) && (!lstatSync(databaseDir).isDirectory() || lstatSync(databaseDir).isSymbolicLink())) throw new Error("Invalid data directory");
  const pg=new EmbeddedPostgres({databaseDir,user:"postgres",password:settings.databasePassword,port:settings.databasePort,persistent:true,authMethod:"scram-sha-256",createPostgresUser:false,postgresFlags:["-h","127.0.0.1","-k",""],onLog:()=>{},onError:()=>{}});
  if (!existsSync(join(databaseDir,"PG_VERSION"))) await pg.initialise();
  await pg.start();
  const client=pg.getPgClient("postgres","127.0.0.1"); await client.connect();
  try {
    if (!(await client.query("SELECT 1 FROM pg_roles WHERE rolname='kumuno_local'")).rowCount) await client.query(`CREATE ROLE kumuno_local LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${settings.databasePassword}'`);
    for (const database of ["kumuno_local_dev","kumuno_local_shadow","kumuno_local_test"]) {
      if (!(await client.query("SELECT 1 FROM pg_database WHERE datname=$1",[database])).rowCount) await client.query(`CREATE DATABASE ${database} OWNER kumuno_local`);
    }
  } finally { await client.end(); }
  process.send?.({ready:true});
  process.once("disconnect",()=>{ void pg.stop().finally(()=>process.exit()); });
}
main().catch(()=>{ process.send?.({ready:false}); process.exitCode=1; });
