-- Dispatch workflow: targeted offers, assignment escalation, provider availability,
-- and geocoded service areas. Additive only.

ALTER TABLE "Order"
ADD COLUMN "assignmentAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "assignmentEscalatedAt" TIMESTAMP(3),
ADD COLUMN "assignmentLastAttemptAt" TIMESTAMP(3),
ADD COLUMN "assignmentUrgent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User"
ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastAssignedAt" TIMESTAMP(3),
ADD COLUMN "serviceAreaLat" DOUBLE PRECISION,
ADD COLUMN "serviceAreaLng" DOUBLE PRECISION,
ADD COLUMN "serviceRadiusKm" INTEGER DEFAULT 50;

CREATE TABLE "OrderOffer" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "distanceM" DOUBLE PRECISION,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderOffer_providerId_status_idx" ON "OrderOffer"("providerId", "status");
CREATE INDEX "OrderOffer_status_expiresAt_idx" ON "OrderOffer"("status", "expiresAt");
CREATE UNIQUE INDEX "OrderOffer_orderId_providerId_key" ON "OrderOffer"("orderId", "providerId");

ALTER TABLE "OrderOffer"
ADD CONSTRAINT "OrderOffer_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderOffer"
ADD CONSTRAINT "OrderOffer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
