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
    await page.goto(`${base}/dashboard/medical-equipment/new`);
    await page.getByLabel('機器管理番号（必須）',{exact:true}).fill('ME-LOCAL-001');
    await page.getByLabel('機器名（必須）',{exact:true}).fill('local-medical-persistence');
    await page.getByLabel('種別（必須）',{exact:true}).fill('試用ポンプ');
    await page.getByRole('button',{name:'保存する',exact:true}).click();
    await expect(page.getByRole('heading',{name:'local-medical-persistence',exact:true})).toBeVisible();
    await page.getByLabel('貸出先の部署（必須）',{exact:true}).selectOption({label:'総務部'});
    await page.getByLabel('貸出先の場所',{exact:true}).fill('local-loan-persistence');
    await page.getByRole('button',{name:'貸出を登録',exact:true}).click();
    await expect(page.getByText('貸出中：総務部 / local-loan-persistence',{exact:true})).toBeVisible();
    await page.getByRole('checkbox',{name:'機器の返却を確認しました'}).check();
    await page.getByRole('button',{name:'返却を記録',exact:true}).click();
    await expect(page.getByText('点検待ちです。点検記録で合格を登録すると、運用中の機器は再貸出できます。',{exact:true})).toBeVisible();
    await page.locator('details').filter({has:page.locator('summary').filter({hasText:'点検を記録'})}).evaluate(el=>{el.open=true;});
    await page.getByLabel('点検結果',{exact:true}).selectOption('PASSED');
    await page.getByLabel('実施した点検内容（必須）',{exact:true}).fill('local-inspection-persistence');
    await page.getByRole('checkbox',{name:'点検内容と結果を確認しました'}).check();
    await page.getByRole('button',{name:'点検結果を保存',exact:true}).click();
    await expect(page.getByRole('button',{name:'貸出を登録',exact:true})).toBeVisible();

    await page.locator('details').filter({has:page.locator('summary').filter({hasText:'修理を依頼'})}).evaluate(el=>{el.open=true;});
    const repairForm=page.locator('form').filter({has:page.locator('input[name="operation"]')});
    await repairForm.getByLabel('不具合の内容（必須）',{exact:true}).fill('local-repair-problem');
    await repairForm.getByRole('checkbox',{name:'修理内容を確認しました'}).check();
    await repairForm.getByRole('button',{name:'修理依頼を登録',exact:true}).click();
    await expect(page.getByRole('button',{name:'対応を開始',exact:true})).toBeVisible();
    await repairForm.getByRole('checkbox',{name:'修理内容を確認しました'}).check();
    await repairForm.getByRole('button',{name:'対応を開始',exact:true}).click();
    await expect(page.getByRole('button',{name:'修理完了を記録',exact:true})).toBeVisible();
    await repairForm.getByLabel('修理対応の内容（必須）',{exact:true}).fill('local-repair-completion');
    await repairForm.getByRole('checkbox',{name:'修理内容を確認しました'}).check();
    await repairForm.getByRole('button',{name:'修理完了を記録',exact:true}).click();
    await expect(page.getByText('修理対応：local-repair-completion',{exact:true})).toBeVisible();
    await page.locator('details').filter({has:page.locator('summary').filter({hasText:'医療機器を編集'})}).evaluate(el=>{el.open=true;});
    const ledgerForm=page.locator('form').filter({has:page.locator('input[name="managementNumber"]')});
    await ledgerForm.getByLabel('台帳上の状態',{exact:true}).selectOption('IN_SERVICE');
    await ledgerForm.getByRole('button',{name:'保存する',exact:true}).click();
    await expect(page.getByText('ME-LOCAL-001 · 運用中',{exact:true})).toBeVisible();
    await page.locator('details').filter({has:page.locator('summary').filter({hasText:'点検を記録'})}).evaluate(el=>{el.open=true;});
    await page.getByLabel('点検結果',{exact:true}).selectOption('PASSED');
    await page.getByLabel('実施した点検内容（必須）',{exact:true}).fill('local-repair-inspection');
    await page.getByRole('checkbox',{name:'点検内容と結果を確認しました'}).check();
    await page.getByRole('button',{name:'点検結果を保存',exact:true}).click();
    await expect(page.getByRole('button',{name:'貸出を登録',exact:true})).toBeVisible();
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
      assert.equal((await again.query('SELECT "managementNumber" FROM "MedicalDevice"')).rows[0].managementNumber,'ME-LOCAL-001');
      assert.equal((await again.query('SELECT "returnInspectionPending" FROM "MedicalDevice"')).rows[0].returnInspectionPending,false);
      assert.equal((await again.query('SELECT result FROM "MedicalInspection"')).rows[0].result,'PASSED');
      assert.equal((await again.query('SELECT count(*)::int AS count FROM "AuditLog" WHERE "resourceType"=\'MedicalInspection\'')).rows[0].count,2);
      assert.equal((await again.query('SELECT status FROM "MedicalRepair"')).rows[0].status,'COMPLETED');
      assert.equal((await again.query('SELECT "completionContent" FROM "MedicalRepair"')).rows[0].completionContent,'local-repair-completion');
      assert.equal((await again.query('SELECT count(*)::int AS count FROM "AuditLog" WHERE "resourceType"=\'MedicalRepair\'')).rows[0].count,3);
      const loan=(await again.query('SELECT "returnedAt", "destinationLocation" FROM "MedicalLoan"')).rows[0];
      assert(loan.returnedAt);assert.equal(loan.destinationLocation,'local-loan-persistence');
      assert.equal((await again.query('SELECT count(*)::int AS count FROM "AuditLog" WHERE "resourceType"=\'MedicalLoan\'')).rows[0].count,2);
      assert.equal((await again.query('SELECT count(*)::int AS count FROM "AuditLog" WHERE "resourceType"=\'MedicalDevice\'')).rows[0].count,6);
      assert.equal((await again.query('SELECT count(*)::int AS count FROM "AuditLog" WHERE "resourceType"=\'Equipment\'')).rows[0].count,1);
    }finally{await again.end();}
    await stop();
    console.log('Local development passed: automatic PostgreSQL/migration/seed, login and CRUD, non-superuser, concurrent refusal, graceful stop, persistent restart and credential-safe output.');
  } finally {await browser?.close();await stop();}
}
