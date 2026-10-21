-- Provider profile fields
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "serviceArea" TEXT,
ADD COLUMN     "vehicleType" TEXT,
ADD COLUMN     "vehicleCapacityKg" INTEGER,
ADD COLUMN     "yearsExperience" INTEGER;

-- Order lifecycle + pricing + geocoded coordinates
ALTER TABLE "Order" ADD COLUMN     "baseAmount" INTEGER,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'FORM',
ADD COLUMN     "packageCategory" TEXT,
ADD COLUMN     "pickupLat" DOUBLE PRECISION,
ADD COLUMN     "pickupLng" DOUBLE PRECISION,
ADD COLUMN     "deliveryLat" DOUBLE PRECISION,
ADD COLUMN     "deliveryLng" DOUBLE PRECISION,
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "paidAt" TIMESTAMP(3);

CREATE INDEX "Order_source_idx" ON "Order"("source");

-- Payment audit fields (COD collection / reversal)
ALTER TABLE "Payment" ADD COLUMN     "collectedByProviderId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3);

-- Provider declines (so an order returns to the pool without re-showing to the same provider)
CREATE TABLE "OrderDecline" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderDecline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderDecline_orderId_providerId_key" ON "OrderDecline"("orderId", "providerId");
CREATE INDEX "OrderDecline_providerId_idx" ON "OrderDecline"("providerId");

ALTER TABLE "OrderDecline" ADD CONSTRAINT "OrderDecline_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderDecline" ADD CONSTRAINT "OrderDecline_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Persistent geocode cache so results survive serverless cold starts
CREATE TABLE "GeocodeCache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeocodeCache_query_key" ON "GeocodeCache"("query");
CREATE INDEX "GeocodeCache_createdAt_idx" ON "GeocodeCache"("createdAt");

-- Backfill: orders that never paid under the old pay-first flow become visible to providers
UPDATE "Order"
SET "status" = 'PRICE_AGREED',
    "baseAmount" = COALESCE("baseAmount", "amount"),
    "source" = COALESCE("source", 'FORM')
WHERE "status" IN ('PENDING', 'AWAITING_PAYMENT');

-- Old flow let providers accept PAID-but-unassigned orders; under pay-at-end these are
-- simply open orders (their paymentStatus stays PAID, i.e. prepaid).
UPDATE "Order" SET "status" = 'PRICE_AGREED' WHERE "status" = 'PAID' AND "assignedProviderId" IS NULL;

-- Backfill base amount for everything else
UPDATE "Order" SET "baseAmount" = "amount" WHERE "baseAmount" IS NULL;

-- Backfill real timestamps so tracking timelines are accurate for historical rows
UPDATE "Order" SET "acceptedAt" = "updatedAt" WHERE "acceptedAt" IS NULL AND "status" IN ('IN_TRANSIT', 'DELIVERED', 'PAID');
UPDATE "Order" SET "deliveredAt" = "updatedAt" WHERE "deliveredAt" IS NULL AND "status" = 'DELIVERED';
UPDATE "Order" SET "paidAt" = "updatedAt" WHERE "paidAt" IS NULL AND "status" = 'PAID';
