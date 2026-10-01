import { randomBytes, createHash } from "node:crypto";
import { createServer } from "node:net";
import { lstat, mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";

export class LocalDevelopmentError extends Error {}
export type LocalSettings = { version: 1; databasePort: number; appPort: number; databasePassword: string; adminPassword: string; authSecret: string };
export const localDirectory = (root: string) => join(root, ".kumuno", "local");
export function assertLocalEnvironment(env: Readonly<Record<string,string | undefined>> = process.env) {
  if (env.NODE_ENV === "production") throw new LocalDevelopmentError("dev:localは開発専用です。本番では利用できません。");
  if (Number(process.versions.node.split(".")[0]) !== 24) throw new LocalDevelopmentError("Node.js 24.xを使用してください。");
  if (process.getuid?.() === 0) throw new LocalDevelopmentError("一般ユーザーで実行してください。sudoは不要です。");
  for (const key of ["DATABASE_URL", "SHADOW_DATABASE_URL", "TEST_DATABASE_URL", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "SEED_ADMIN_PASSWORD", "SEED_ALLOW_DEVELOPMENT", "AUTH_TRUSTED_IP_HEADER"]) {
    if (env[key] !== undefined) throw new LocalDevelopmentError(`${key}が環境変数に設定されています。既存DBにはnpm run devを使ってください。`);
  }
}
export function validateSettings(value: unknown): LocalSettings {
  if (!value || typeof value !== "object") throw new LocalDevelopmentError("開発用設定を読み込めません。");
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || ![v.databasePort,v.appPort].every(p=>Number.isInteger(p) && Number(p)>1024 && Number(p)<=65535) || v.databasePort===v.appPort || ![v.databasePassword,v.adminPassword,v.authSecret].every(s=>typeof s==="string" && /^[a-f0-9]{64}$/.test(s))) throw new LocalDevelopmentError("開発用設定が不正です。データを削除せず設定を確認してください。");
  return v as LocalSettings;
}
export function localUrl(settings: LocalSettings, database = "kumuno_local_dev") {
  if (!["kumuno_local_dev","kumuno_local_shadow","kumuno_local_test"].includes(database)) throw new LocalDevelopmentError("開発専用DB名が必要です。");
  return `postgresql://kumuno_local:${settings.databasePassword}@127.0.0.1:${settings.databasePort}/${database}`;
}
export function localEnv(settings: LocalSettings) {
  return `# KUMUNO dev:local managed development configuration\nDATABASE_URL=${localUrl(settings)}\nSHADOW_DATABASE_URL=${localUrl(settings,"kumuno_local_shadow")}\nBETTER_AUTH_URL=http://127.0.0.1:${settings.appPort}\nBETTER_AUTH_SECRET=${settings.authSecret}\n`;
}
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export async function privateDirectory(path: string) {
  try { await mkdir(path,{mode:0o700}); } catch (e) { if ((e as NodeJS.ErrnoException).code!=="EEXIST") throw e; }
  const entry = await lstat(path);
  if (!entry.isDirectory() || entry.isSymbolicLink()) throw new LocalDevelopmentError("開発用データ保存先には通常のディレクトリが必要です。");
  await chmod(path,0o700);
}
export async function readPrivate(path: string): Promise<string | undefined> {
  try {
    const entry = await lstat(path);
    if (!entry.isFile() || entry.isSymbolicLink()) throw new LocalDevelopmentError("設定には通常のファイルが必要です。");
    return await readFile(path,"utf8");
  } catch (e) { if ((e as NodeJS.ErrnoException).code==="ENOENT") return undefined; throw e; }
}
export async function freePort(preferred = 0): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(preferred,"127.0.0.1",resolve);});
  const address = server.address();
  if (!address || typeof address === "string") throw new LocalDevelopmentError("ポートを確保できません。");
  await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  return address.port;
}
export async function prepareSettings(root: string) {
  const envPath=join(root,".env.local"), directory=localDirectory(root);
  // Check existing configuration before creating any cluster or changing any settings.
  const existingEnv = await readPrivate(envPath);
  if (existingEnv && !existingEnv.startsWith("# KUMUNO dev:local managed development configuration\n")) throw new LocalDevelopmentError("既存の.env.localがあります。上書きしません。既存DBにはnpm run devを使ってください。");
  await privateDirectory(join(root,".kumuno")); await privateDirectory(directory);
  const settingsPath=join(directory,"settings.json"), previous=await readPrivate(settingsPath);
  if (existingEnv!==undefined && !previous) throw new LocalDevelopmentError("既存の.env.localはこのセットアップの管理対象ではありません。");
  let settings: LocalSettings;
  if (previous) settings=validateSettings(JSON.parse(previous));
  else {
    const appPort=await freePort(3000).catch(()=>freePort());
    settings={version:1,databasePort:await freePort(),appPort,databasePassword:randomBytes(32).toString("hex"),adminPassword:randomBytes(32).toString("hex"),authSecret:randomBytes(32).toString("hex")};
    await writeFile(settingsPath,JSON.stringify(settings,null,2)+"\n",{flag:"wx",mode:0o600});
  }
  const expected=localEnv(settings);
  if (existingEnv!==undefined && digest(existingEnv)!==digest(expected)) throw new LocalDevelopmentError(".env.localが変更されています。上書きしません。通常のnpm run devを使用してください。");
  if (existingEnv===undefined) await writeFile(envPath,expected,{flag:"wx",mode:0o600});
  await chmod(settingsPath,0o600); await chmod(envPath,0o600);
  const loginPath=join(directory,"login.txt");
  if (await readPrivate(loginPath)===undefined) await writeFile(loginPath,`開発用初期管理者\nメール: admin@example.com\nパスワード: ${settings.adminPassword}\nパスワードをアプリ側で変更した場合、この初期値は使用できません。\n`,{flag:"wx",mode:0o600});
  await chmod(loginPath,0o600);
  return settings;
}
