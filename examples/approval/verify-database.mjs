import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { applyApprovalCommand } from "./transaction.mjs";
const schema = "kumuno_approval_" + randomUUID().replaceAll("-", "");
const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 5000 });
let created = false;
try {
  await pool.query(`CREATE SCHEMA "${schema}"`); created = true;
  await pool.query(`CREATE TABLE "${schema}".users (id text PRIMARY KEY, "organizationId" text NOT NULL, "departmentId" text, role text NOT NULL, "isActive" boolean NOT NULL);
    CREATE TABLE "${schema}".requests (id text PRIMARY KEY, "organizationId" text NOT NULL, "requestedById" text NOT NULL, status text NOT NULL, version integer NOT NULL);
    CREATE TABLE "${schema}".decisions (id bigserial PRIMARY KEY, "requestId" text NOT NULL, action text NOT NULL, "actorId" text NOT NULL, reason text, timestamp timestamptz NOT NULL DEFAULT now());
    CREATE TABLE "${schema}".audit (id bigserial PRIMARY KEY, "organizationId" text, "userId" text, action text, "resourceType" text, "resourceId" text, metadata jsonb, before jsonb, after jsonb, timestamp timestamptz NOT NULL DEFAULT now());`);
  await pool.query(`INSERT INTO "${schema}".users VALUES ('owner','org',NULL,'USER',true),('reviewer','org',NULL,'MANAGER',true),('outsider','other',NULL,'ADMIN',true)`);
  const add = id => pool.query(`INSERT INTO "${schema}".requests VALUES ($1,'org','owner','DRAFT',0)`, [id]);
  const get = async id => (await pool.query(`SELECT * FROM "${schema}".requests WHERE id=$1`, [id])).rows[0];
  const execute = (actor, id, command) => applyApprovalCommand(pool, schema, actor, id, command);
  const submit = version => ({action:"SUBMIT",expectedVersion:version});
  const approve = version => ({action:"APPROVE",expectedVersion:version});
  await add("workflow");
  await execute("owner","workflow",submit(0));
  await assert.rejects(execute("owner","workflow",approve(1)),error=>error.code==="FORBIDDEN");
  await execute("reviewer","workflow",{action:"RETURN",expectedVersion:1,reason:"  private review detail  "});
  await assert.rejects(execute("reviewer","workflow",submit(2)),error=>error.code==="FORBIDDEN");
  await execute("owner","workflow",submit(2));
  await execute("reviewer","workflow",approve(3));
  assert.equal((await get("workflow")).status,"APPROVED");assert.equal((await get("workflow")).version,4);
  const decisions = (await pool.query(`SELECT * FROM "${schema}".decisions ORDER BY id`)).rows;
  assert.equal(decisions.length,4);assert.equal(decisions[1].reason,"private review detail");
  const logs = (await pool.query(`SELECT * FROM "${schema}".audit ORDER BY id`)).rows;
  assert.equal(logs.length,4);assert.equal(JSON.stringify(logs).includes("private review detail"),false);
  await assert.rejects(execute("reviewer","workflow",approve(4)),error=>error.code==="INVALID_STATE");
  await add("access");await execute("owner","access",submit(0));
  await pool.query(`UPDATE "${schema}".users SET role='USER' WHERE id='reviewer'`);
  await assert.rejects(execute("reviewer","access",approve(1)),error=>error.code==="FORBIDDEN");
  await pool.query(`UPDATE "${schema}".users SET role='MANAGER', "isActive"=false WHERE id='reviewer'`);
  await assert.rejects(execute("reviewer","access",approve(1)),error=>error.code==="FORBIDDEN");
  await pool.query(`UPDATE "${schema}".users SET "isActive"=true WHERE id='reviewer'`);
  await assert.rejects(execute("outsider","access",approve(1)),error=>error.code==="FORBIDDEN");
  assert.equal((await get("access")).status,"PENDING");
  await add("concurrent");await execute("owner","concurrent",submit(0));
  // Hold the request row so both commands read the same version before either saves.
  const blocker=await pool.connect();
  let commands;
  try {
    await blocker.query("BEGIN");
    await blocker.query(`SELECT id FROM "${schema}".requests WHERE id='concurrent' FOR UPDATE`);
    commands=Promise.allSettled([execute("reviewer","concurrent",approve(1)),execute("reviewer","concurrent",{action:"RETURN",expectedVersion:1,reason:"review"})]);
    let waiting=0;
    const deadline=Date.now()+10000;
    while(Date.now()<deadline){
      waiting=(await pool.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE $1", [`%UPDATE "${schema}".requests SET%`])).rows[0].count;
      if(waiting===2)break;
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    assert.equal(waiting,2,"Both approval commands must overlap while waiting to save.");
  } finally { await blocker.query("ROLLBACK"); blocker.release(); }
  const concurrent=await commands;
  assert.equal(concurrent.filter(result=>result.status==="fulfilled").length,1);
  assert.equal(concurrent.find(result=>result.status==="rejected").reason.code,"CONFLICT");
  assert.equal((await get("concurrent")).version,2);
  assert.equal((await pool.query(`SELECT count(*)::int AS count FROM "${schema}".decisions WHERE "requestId"='concurrent'`)).rows[0].count,2);
  assert.equal((await pool.query(`SELECT count(*)::int AS count FROM "${schema}".audit WHERE "resourceId"='concurrent'`)).rows[0].count,2);
  await add("rollback");
  await pool.query(`CREATE FUNCTION "${schema}".fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END; $$;
    CREATE TRIGGER fail_audit BEFORE INSERT ON "${schema}".audit FOR EACH ROW EXECUTE FUNCTION "${schema}".fail_audit();`);
  await assert.rejects(execute("owner","rollback",submit(0)));
  assert.equal((await get("rollback")).status,"DRAFT");assert.equal((await get("rollback")).version,0);
  assert.equal((await pool.query(`SELECT count(*)::int AS count FROM "${schema}".decisions WHERE "requestId"='rollback'`)).rows[0].count,0);
  assert.equal((await pool.query(`SELECT count(*)::int AS count FROM "${schema}".audit WHERE "resourceId"='rollback'`)).rows[0].count,0);
  console.log("Approval PostgreSQL integration passed: submit/return/resubmit/approve, latest actor, self-review and foreign-organization denial, concurrent CAS, history, safe audit and full rollback.");
} finally {
  try { if(created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`); }
  finally { await pool.end(); }
}
