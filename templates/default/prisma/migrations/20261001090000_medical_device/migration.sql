BEGIN;
-- CreateEnum
CREATE TYPE "MedicalDeviceStatus" AS ENUM ('IN_SERVICE', 'SUSPENDED', 'RETIRED');

-- CreateTable
CREATE TABLE "MedicalDevice" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "managementNumber" TEXT NOT NULL,
    "assetNumber" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "manufacturer" TEXT,
    "modelName" TEXT,
    "serialNumber" TEXT,
    "departmentId" UUID,
    "location" TEXT,
    "purchaseDate" DATE,
    "warrantyUntil" DATE,
    "status" "MedicalDeviceStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalDevice_organizationId_name_id_idx" ON "MedicalDevice"("organizationId", "name", "id");

-- CreateIndex
CREATE INDEX "MedicalDevice_departmentId_organizationId_idx" ON "MedicalDevice"("departmentId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalDevice_organizationId_managementNumber_key" ON "MedicalDevice"("organizationId", "managementNumber");

-- AddForeignKey
ALTER TABLE "MedicalDevice" ADD CONSTRAINT "MedicalDevice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDevice" ADD CONSTRAINT "MedicalDevice_departmentId_organizationId_fkey" FOREIGN KEY ("departmentId", "organizationId") REFERENCES "Department"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;


COMMIT;
