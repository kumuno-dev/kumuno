BEGIN;
CREATE TYPE "EquipmentStatus" AS ENUM ('IN_USE', 'STORAGE', 'REPAIR', 'DISPOSED');
CREATE UNIQUE INDEX "User_id_organizationId_key" ON "User"("id", "organizationId");
CREATE TABLE "Equipment" (
 "id" UUID NOT NULL, "organizationId" UUID NOT NULL,
 "name" TEXT NOT NULL, "category" TEXT NOT NULL,
 "purchaseDate" DATE, "purchasePrice" DECIMAL(14,2),
 "departmentId" UUID, "assignedUserId" UUID,
 "status" "EquipmentStatus" NOT NULL DEFAULT 'STORAGE', "notes" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Equipment_price_check" CHECK ("purchasePrice" IS NULL OR "purchasePrice" >= 0),
 CONSTRAINT "Equipment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "Equipment_departmentId_organizationId_fkey" FOREIGN KEY ("departmentId", "organizationId") REFERENCES "Department"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "Equipment_assignedUserId_organizationId_fkey" FOREIGN KEY ("assignedUserId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX "Equipment_organizationId_name_id_idx" ON "Equipment"("organizationId", "name", "id");
CREATE INDEX "Equipment_departmentId_organizationId_idx" ON "Equipment"("departmentId", "organizationId");
CREATE INDEX "Equipment_assignedUserId_organizationId_idx" ON "Equipment"("assignedUserId", "organizationId");
COMMIT;
