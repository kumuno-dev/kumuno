BEGIN;
-- CreateEnum
CREATE TYPE "MedicalInspectionResult" AS ENUM ('PASSED', 'FAILED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "MedicalInspectionKind" AS ENUM ('POST_RETURN', 'PERIODIC', 'OTHER');

-- CreateTable
CREATE TABLE "MedicalInspection" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "inspectedById" UUID NOT NULL,
    "returnLoanId" UUID,
    "inspectionDate" DATE NOT NULL,
    "kind" "MedicalInspectionKind" NOT NULL,
    "result" "MedicalInspectionResult" NOT NULL,
    "content" TEXT NOT NULL,
    "nextInspectionDate" DATE,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedPending" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MedicalInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalInspection_organizationId_inspectionDate_id_idx" ON "MedicalInspection"("organizationId", "inspectionDate", "id");

-- CreateIndex
CREATE INDEX "MedicalInspection_deviceId_organizationId_idx" ON "MedicalInspection"("deviceId", "organizationId");

-- CreateIndex
CREATE INDEX "MedicalInspection_inspectedById_organizationId_idx" ON "MedicalInspection"("inspectedById", "organizationId");

-- CreateIndex
CREATE INDEX "MedicalInspection_returnLoanId_organizationId_idx" ON "MedicalInspection"("returnLoanId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalLoan_id_organizationId_key" ON "MedicalLoan"("id", "organizationId");

-- AddForeignKey
ALTER TABLE "MedicalInspection" ADD CONSTRAINT "MedicalInspection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalInspection" ADD CONSTRAINT "MedicalInspection_deviceId_organizationId_fkey" FOREIGN KEY ("deviceId", "organizationId") REFERENCES "MedicalDevice"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MedicalInspection" ADD CONSTRAINT "MedicalInspection_returnLoanId_organizationId_fkey" FOREIGN KEY ("returnLoanId", "organizationId") REFERENCES "MedicalLoan"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MedicalInspection" ADD CONSTRAINT "MedicalInspection_inspectedById_organizationId_fkey" FOREIGN KEY ("inspectedById", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;


COMMIT;
