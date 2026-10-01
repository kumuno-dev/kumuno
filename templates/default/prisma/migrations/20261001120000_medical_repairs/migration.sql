BEGIN;
CREATE TYPE "MedicalRepairStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TABLE "MedicalRepair" (
 "id" UUID NOT NULL PRIMARY KEY,
 "organizationId" UUID NOT NULL,
 "deviceId" UUID NOT NULL,
 "reportedById" UUID NOT NULL,
 "status" "MedicalRepairStatus" NOT NULL DEFAULT 'REQUESTED',
 "problem" TEXT NOT NULL,
 "completionContent" TEXT,
 "reportedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "startedAt" TIMESTAMPTZ(3),
 "completedAt" TIMESTAMPTZ(3),
 CONSTRAINT "MedicalRepair_state_check" CHECK (
  ("status" = 'REQUESTED' AND "startedAt" IS NULL AND "completedAt" IS NULL AND "completionContent" IS NULL) OR
  ("status" = 'IN_PROGRESS' AND "startedAt" IS NOT NULL AND "completedAt" IS NULL AND "completionContent" IS NULL) OR
  ("status" = 'COMPLETED' AND "startedAt" IS NOT NULL AND "completedAt" IS NOT NULL AND "completionContent" IS NOT NULL AND length(trim("completionContent")) > 0)
 ),
 CONSTRAINT "MedicalRepair_time_check" CHECK (("startedAt" IS NULL OR "startedAt" >= "reportedAt") AND ("completedAt" IS NULL OR "completedAt" >= "startedAt")),
 CONSTRAINT "MedicalRepair_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "MedicalRepair_deviceId_organizationId_fkey" FOREIGN KEY ("deviceId","organizationId") REFERENCES "MedicalDevice"("id","organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "MedicalRepair_reportedById_organizationId_fkey" FOREIGN KEY ("reportedById","organizationId") REFERENCES "User"("id","organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "MedicalRepair_one_open_per_device" ON "MedicalRepair"("deviceId") WHERE "status" <> 'COMPLETED';
CREATE INDEX "MedicalRepair_organizationId_reportedAt_id_idx" ON "MedicalRepair"("organizationId","reportedAt","id");
CREATE INDEX "MedicalRepair_deviceId_organizationId_idx" ON "MedicalRepair"("deviceId","organizationId");
CREATE INDEX "MedicalRepair_reportedById_organizationId_idx" ON "MedicalRepair"("reportedById","organizationId");
COMMIT;
