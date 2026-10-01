import {execFileSync} from "node:child_process";
import {mkdtemp,readFile,writeFile,mkdir,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const stage=await mkdtemp(join(tmpdir(),"kumuno-auth-pack-"));
try {
 const [pack]=JSON.parse(execFileSync("npm",["pack","--ignore-scripts","--json","--workspaces=false","--dry-run=false","--pack-destination",stage],{cwd:join(root,"packages/auth"),encoding:"utf8",env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^npm_config_(workspace|workspaces|pack_destination|dry_run)$/i.test(key)))}));
 const vendor=join(root,"templates/default/vendor");await mkdir(vendor,{recursive:true});
 const bytes=await readFile(join(stage,pack.filename)),target=join(vendor,pack.filename);
 let before;try{before=await readFile(target);}catch{ /* initial bundle */ }
 if(!before?.equals(bytes))await writeFile(target,bytes);
 console.error(`Bundled ${pack.name}@${pack.version}: ${pack.files.length} files.`);
} finally {await rm(stage,{recursive:true,force:true});}
