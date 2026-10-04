BEGIN;
CREATE TABLE "Notification" (
 "id" UUID NOT NULL,
 "organizationId" UUID NOT NULL,
 "recipientId" UUID NOT NULL,
 "key" TEXT NOT NULL,
 "title" TEXT NOT NULL,
 "message" TEXT NOT NULL,
 "href" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "readAt" TIMESTAMPTZ(3),
 CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "Notification_recipientId_organizationId_fkey" FOREIGN KEY ("recipientId","organizationId") REFERENCES "User"("id","organizationId") ON DELETE CASCADE ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "Notification_organizationId_recipientId_key_key" ON "Notification"("organizationId","recipientId","key");
CREATE INDEX "Notification_organizationId_recipientId_readAt_createdAt_id_idx" ON "Notification"("organizationId","recipientId","readAt","createdAt","id");
COMMIT;
