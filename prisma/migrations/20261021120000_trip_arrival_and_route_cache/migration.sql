-- Trip start, arrival verification, and dispatch override audit fields
ALTER TABLE "Order" ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "arrivalDistanceM" DOUBLE PRECISION,
ADD COLUMN     "arrivalAccuracyM" DOUBLE PRECISION,
ADD COLUMN     "deliveryOverrideAt" TIMESTAMP(3),
ADD COLUMN     "deliveryOverrideById" TEXT,
ADD COLUMN     "deliveryOverrideReason" TEXT;

-- Existing in-flight and completed trips started when they were accepted.
UPDATE "Order"
SET "startedAt" = COALESCE("acceptedAt", "updatedAt")
WHERE "startedAt" IS NULL
  AND "status" IN ('IN_TRANSIT', 'AWAITING_PAYMENT', 'PAID', 'DELIVERED');

-- Cached road routes keyed by rounded origin/destination coordinates.
CREATE TABLE "RouteCache" (
    "key" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "distanceM" INTEGER NOT NULL,
    "durationS" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteCache_pkey" PRIMARY KEY ("key")
);
