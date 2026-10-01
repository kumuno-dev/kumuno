BEGIN;
ALTER TABLE "MedicalDevice" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "MedicalSampleDataset" (
 "organizationId" UUID PRIMARY KEY,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "MedicalSampleDataset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
COMMIT;
