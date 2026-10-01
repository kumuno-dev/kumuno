import { execFileSync } from "node:child_process";
import { cp, mkdtemp, rm, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { templateFiles, templateFilter, bundledName } from '../src/template-files.mjs';
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const source = fileURLToPath(new URL('../../../templates/default/', import.meta.url));
execFileSync(process.execPath,[fileURLToPath(new URL("../../../scripts/bundle-auth.mjs",import.meta.url))],{stdio:"inherit"});
execFileSync(process.execPath,[fileURLToPath(new URL("../../../scripts/bundle-rbac.mjs",import.meta.url))],{stdio:"inherit"});
execFileSync(process.execPath,[fileURLToPath(new URL("../../../scripts/bundle-audit-log.mjs",import.meta.url))],{stdio:"inherit"});
execFileSync(process.execPath,[fileURLToPath(new URL("../../../scripts/bundle-approval.mjs",import.meta.url))],{stdio:"inherit"});
const staging = await mkdtemp(resolve(packageRoot, '.template-stage-'));
try {
  for (const entry of templateFiles) await cp(resolve(source, entry), resolve(staging, bundledName(entry)), { recursive: true, filter: templateFilter });
  await rm(resolve(packageRoot,'template'), { recursive: true, force: true });
  await rename(staging, resolve(packageRoot,'template'));
  console.error('Bundled standalone application template.');
} finally { await rm(staging, { recursive: true, force: true }); }
