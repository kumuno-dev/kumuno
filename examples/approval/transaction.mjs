import { transitionApproval, ApprovalError } from "@kumuno/approval";
import { createRbacPolicy } from "@kumuno/rbac";
import { appendAuditLog } from "@kumuno/audit-log";
const policy = createRbacPolicy({
  ADMIN: ["approval:submit", "approval:review"], MANAGER: ["approval:submit", "approval:review"], USER: ["approval:submit"],
});
// Executable test adapter, not a generated application's schema or HTTP endpoint.
// actorId must originate from a verified server session. Commands need boundary validation.
export async function applyApprovalCommand(pool, schema, actorId, requestId, command) {
  if (!/^kumuno_approval_[a-f0-9]{32}$/.test(schema)) throw new Error("Invalid example schema.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    const actor = (await client.query(`SELECT * FROM "${schema}".users WHERE id=$1`, [actorId])).rows[0];
    const request = (await client.query(`SELECT * FROM "${schema}".requests WHERE id=$1 AND "organizationId"=$2`, [requestId, actor?.organizationId])).rows[0];
    if (!request) throw new ApprovalError("FORBIDDEN");
    const result = transitionApproval({ request, actor, command, can: policy.can });
    const updated = await client.query(`UPDATE "${schema}".requests SET status=$1, version=$2
      WHERE id=$3 AND "organizationId"=$4 AND status=$5 AND version=$6`,
      [result.request.status, result.request.version, request.id, actor.organizationId, request.status, request.version]);
    if (updated.rowCount !== 1) throw new ApprovalError("CONFLICT");
    await client.query(`INSERT INTO "${schema}".decisions ("requestId", action, "actorId", reason) VALUES ($1,$2,$3,$4)`,
      [request.id, result.action, actor.id, result.reason]);
    // Free-text reasons remain in business history, not audit snapshots.
    await appendAuditLog(entry => client.query(`INSERT INTO "${schema}".audit
      ("organizationId", "userId", action, "resourceType", "resourceId", metadata, before, after)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [entry.organizationId, entry.userId, entry.action, entry.resourceType, entry.resourceId,
       JSON.stringify(entry.metadata), JSON.stringify(entry.before), JSON.stringify(entry.after)]), actor,
      { action: "UPDATE", resourceType: "ApprovalRequest", resourceId: request.id,
        before: { status: request.status, version: request.version },
        after: { status: result.request.status, version: result.request.version } });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "40001") throw new ApprovalError("CONFLICT");
    throw error;
  }
  finally { client.release(); }
}
