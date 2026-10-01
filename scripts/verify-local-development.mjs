import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';

export async function verifyLocalDevelopment(app, env) {
  const require=createRequire(join(app,'package.json'));
  const {chromium,expect}=require('@playwright/test');
  const {Pool}=require('pg');
  let child, output='', browser;
  const start=()=>{
    output='';
    child=spawn(process.execPath,['--import','tsx','scripts/dev-local.ts'],{cwd:app,env,stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',chunk=>{output=(output+chunk).slice(-10000);});
    child.stderr.on('data',chunk=>{output=(output+chunk).slice(-10000);});
  };
  const stop=async(signal='SIGTERM')=>{
    if (!child || child.exitCode!==null || child.signalCode!==null)return;
    const exited=once(child,'exit');child.kill(signal);
    const timeout=setTimeout(()=>child.kill('SIGKILL'),15000);
    try {await exited;}finally{clearTimeout(timeout);}
    await assert.rejects(access(join(app,'.kumuno/local/run.lock')),'Runner must release its lock.');
  };
  const settings=async()=>JSON.parse(await readFile(join(app,'.kumuno/local/settings.json'),'utf8'));
  const ready=async()=>{
    for(let i=0;i<600;i++){
      assert(child.exitCode===null && child.signalCode===null,'Development runner exited before ready.');
      if(output.includes('準備できました。')){
        const config=await settings();
        try{if((await fetch(`http://127.0.0.1:${config.appPort}/login`)).ok)return config;}catch{/* startup */}
      }
      await new Promise(r=>setTimeout(r,100));
    }
    throw new Error('Development setup timed out.');
  };
  const connect=async config=>{
    const pool=new Pool({host:'127.0.0.1',port:config.databasePort,user:'kumuno_local',password:config.databasePassword,database:'kumuno_local_dev'});
    return pool;
  };
  try {
    start(); const first=await ready();
    assert(!output.includes(first.databasePassword)&&!output.includes(first.adminPassword)&&!output.includes(first.authSecret),'Startup output must not disclose credentials.');
    browser=await chromium.launch();const page=await browser.newPage();
    const base=`http://127.0.0.1:${first.appPort}`;
    await page.goto(`${base}/login`);
    await page.getByLabel('メールアドレス').fill('admin@example.com');
    await page.getByLabel('パスワード',{exact:true}).fill(first.adminPassword);
    await page.getByRole('button',{name:'ログイン',exact:true}).click();
    await expect(page).toHaveURL(`${base}/dashboard`);
    await page.goto(`${base}/dashboard/equipment/new`);
    await page.getByLabel('備品名',{exact:true}).fill('local-persistence-probe');
    await page.getByLabel('カテゴリ',{exact:true}).fill('開発用');
    await page.getByRole('button',{name:'保存する',exact:true}).click();
    await expect(page.getByRole('heading',{name:'local-persistence-probe',exact:true})).toBeVisible();
    await browser.close();browser=undefined;
    const pool=await connect(first);
    let before;
    try {
      assert.equal((await pool.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user')).rows[0].rolsuper,false);
      before=(await pool.query('SELECT id FROM "User"')).rows[0].id;
      assert.equal((await pool.query('SELECT count(*)::int AS count FROM "Equipment"')).rows[0].count,1);
    }finally{await pool.end();}
    // Concurrent launch is refused; existing runner remains available.
    const duplicate=spawn(process.execPath,['--import','tsx','scripts/dev-local.ts'],{cwd:app,env,stdio:'ignore'});
    const [duplicateCode]=await once(duplicate,'exit');assert.equal(duplicateCode,1);
    await stop('SIGINT');
    await assert.rejects(fetch(`${base}/login`));
    start();const second=await ready();assert.deepEqual(second,first);
    const again=await connect(second);
    try {
      assert.equal((await again.query('SELECT id FROM "User"')).rows[0].id,before);
      assert.equal((await again.query('SELECT count(*)::int AS count FROM "Equipment"')).rows[0].count,1);
      assert.equal((await again.query('SELECT count(*)::int AS count FROM "AuditLog" WHERE "resourceType"=\'Equipment\'')).rows[0].count,1);
    }finally{await again.end();}
    await stop();
    console.log('Local development passed: automatic PostgreSQL/migration/seed, login and CRUD, non-superuser, concurrent refusal, graceful stop, persistent restart and credential-safe output.');
  } finally {await browser?.close();await stop();}
}
