BEGIN;
-- AlterTable
ALTER TABLE "MedicalDevice" ADD COLUMN     "returnInspectionPending" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MedicalLoan" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "destinationName" TEXT NOT NULL,
    "destinationLocation" TEXT,
    "loanedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loanedById" UUID NOT NULL,
    "returnedAt" TIMESTAMPTZ(3),
    "returnedById" UUID,

    CONSTRAINT "MedicalLoan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalLoan_organizationId_returnedAt_loanedAt_id_idx" ON "MedicalLoan"("organizationId", "returnedAt", "loanedAt", "id");

-- CreateIndex
CREATE INDEX "MedicalLoan_deviceId_organizationId_idx" ON "MedicalLoan"("deviceId", "organizationId");

-- CreateIndex
CREATE INDEX "MedicalLoan_departmentId_organizationId_idx" ON "MedicalLoan"("departmentId", "organizationId");

-- CreateIndex
CREATE INDEX "MedicalLoan_loanedById_organizationId_idx" ON "MedicalLoan"("loanedById", "organizationId");

-- CreateIndex
CREATE INDEX "MedicalLoan_returnedById_organizationId_idx" ON "MedicalLoan"("returnedById", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalDevice_id_organizationId_key" ON "MedicalDevice"("id", "organizationId");

-- AddForeignKey
ALTER TABLE "MedicalLoan" ADD CONSTRAINT "MedicalLoan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalLoan" ADD CONSTRAINT "MedicalLoan_deviceId_organizationId_fkey" FOREIGN KEY ("deviceId", "organizationId") REFERENCES "MedicalDevice"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MedicalLoan" ADD CONSTRAINT "MedicalLoan_departmentId_organizationId_fkey" FOREIGN KEY ("departmentId", "organizationId") REFERENCES "Department"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MedicalLoan" ADD CONSTRAINT "MedicalLoan_loanedById_organizationId_fkey" FOREIGN KEY ("loanedById", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MedicalLoan" ADD CONSTRAINT "MedicalLoan_returnedById_organizationId_fkey" FOREIGN KEY ("returnedById", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- One open loan per device, including writes outside the service.
CREATE UNIQUE INDEX "MedicalLoan_one_open_per_device" ON "MedicalLoan" ("deviceId", "organizationId") WHERE "returnedAt" IS NULL;
ALTER TABLE "MedicalLoan" ADD CONSTRAINT "MedicalLoan_return_actor_check" CHECK (("returnedAt" IS NULL AND "returnedById" IS NULL) OR ("returnedAt" IS NOT NULL AND "returnedById" IS NOT NULL AND "returnedAt" >= "loanedAt"));
COMMIT;
