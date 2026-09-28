BEGIN;
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');
CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "action" "AuditAction" NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" UUID NOT NULL,
  "timestamp" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL,
  "before" JSONB,
  "after" JSONB,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_organizationId_timestamp_id_idx" ON "AuditLog"("organizationId", "timestamp", "id");
CREATE INDEX "AuditLog_organizationId_resourceType_resourceId_idx" ON "AuditLog"("organizationId", "resourceType", "resourceId");
-- Defense in depth: normal application SQL cannot rewrite history.
CREATE FUNCTION reject_audit_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are append-only' USING ERRCODE = '42501';
END;
$$;
CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON "AuditLog"
FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_log_mutation();
COMMIT;
