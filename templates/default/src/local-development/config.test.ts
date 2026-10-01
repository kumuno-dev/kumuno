import { mkdtemp, readFile, stat, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { assertLocalEnvironment, prepareSettings, localDirectory, localEnv, validateSettings } from "./config";

test("開発セットアップは本番・既存接続環境変数を拒否する", () => {
  expect(()=>assertLocalEnvironment({NODE_ENV:"production"})).toThrow("開発専用");
  for (const key of ["DATABASE_URL","SHADOW_DATABASE_URL","TEST_DATABASE_URL","BETTER_AUTH_URL","BETTER_AUTH_SECRET"]) expect(()=>assertLocalEnvironment({[key]:"private-value"})).toThrow(key);
  expect(()=>validateSettings({version:1,databasePort:5432,appPort:3000,databasePassword:"weak"})).toThrow();
});
test("初回設定の再実行は資格情報を保持し、既存設定変更を上書きしない", async () => {
  const root=await mkdtemp(join(tmpdir(),"kumuno-local-settings-"));
  try {
    const first=await prepareSettings(root), second=await prepareSettings(root);
    expect(second).toEqual(first);
    expect(await readFile(join(root,".env.local"),"utf8")).toBe(localEnv(first));
    if (process.platform!=="win32") {
      expect((await stat(join(root,".env.local"))).mode & 0o777).toBe(0o600);
      expect((await stat(join(localDirectory(root),"settings.json"))).mode & 0o777).toBe(0o600);
      expect((await stat(join(localDirectory(root),"login.txt"))).mode & 0o777).toBe(0o600);
    }
    await writeFile(join(root,".env.local"),localEnv(first)+"# manually changed\n");
    await expect(prepareSettings(root)).rejects.toThrow("上書きしません");
    expect(await readFile(join(root,".env.local"),"utf8")).toContain("manually changed");
  } finally { await rm(root,{recursive:true,force:true}); }
});
test("既存の.env.localとsymlinkを拒否し、対象ファイルを変更しない", async () => {
  const root=await mkdtemp(join(tmpdir(),"kumuno-local-existing-"));
  const target=join(root,"existing.txt"), env=join(root,".env.local");
  try {
    await writeFile(env,"DATABASE_URL=existing-private-db\n");
    await expect(prepareSettings(root)).rejects.toThrow("上書きしません");
    expect(await readFile(env,"utf8")).toBe("DATABASE_URL=existing-private-db\n");
    await rm(env); await writeFile(target,"unchanged"); await symlink(target,env);
    await expect(prepareSettings(root)).rejects.toThrow("通常のファイル");
    expect(await readFile(target,"utf8")).toBe("unchanged");
  } finally { await rm(root,{recursive:true,force:true}); }
});
