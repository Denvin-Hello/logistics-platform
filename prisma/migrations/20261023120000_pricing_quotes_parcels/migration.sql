-- Distance-based pricing, stored quotes, and per-parcel order data
ALTER TABLE "Order"
ADD COLUMN     "distanceM" INTEGER,
ADD COLUMN     "distanceKm" DOUBLE PRECISION,
ADD COLUMN     "chargeableWeightKg" DOUBLE PRECISION,
ADD COLUMN     "pricingConfigVersion" INTEGER;

CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "baseFare" INTEGER NOT NULL,
    "minimumFare" INTEGER NOT NULL,
    "distanceBands" JSONB NOT NULL,
    "distanceRates" JSONB NOT NULL,
    "freeWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "weightBands" JSONB NOT NULL,
    "weightRates" JSONB NOT NULL,
    "volumetricDivisor" INTEGER NOT NULL DEFAULT 5000,
    "quoteTtlMinutes" INTEGER NOT NULL DEFAULT 15,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL DEFAULT 'FORM',
    "pickupAddress" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "deliveryLat" DOUBLE PRECISION NOT NULL,
    "deliveryLng" DOUBLE PRECISION NOT NULL,
    "distanceM" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "parcels" JSONB NOT NULL,
    "chargeableWeightKg" DOUBLE PRECISION NOT NULL,
    "baseFare" INTEGER NOT NULL,
    "distanceFare" INTEGER NOT NULL,
    "weightFare" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "pricingConfigId" TEXT NOT NULL,
    "pricingConfigVersion" INTEGER NOT NULL,
    "pricingSnapshot" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderParcel" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "actualWeightKg" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "chargeableWeightKg" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderParcel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PricingConfig_version_key" ON "PricingConfig"("version");
CREATE INDEX "PricingConfig_isActive_idx" ON "PricingConfig"("isActive");
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");
CREATE INDEX "Quote_status_idx" ON "Quote"("status");
CREATE INDEX "Quote_expiresAt_idx" ON "Quote"("expiresAt");
CREATE UNIQUE INDEX "Quote_orderId_key" ON "Quote"("orderId");
CREATE INDEX "OrderParcel_orderId_idx" ON "OrderParcel"("orderId");

ALTER TABLE "PricingConfig" ADD CONSTRAINT "PricingConfig_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_pricingConfigId_fkey"
    FOREIGN KEY ("pricingConfigId") REFERENCES "PricingConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderParcel" ADD CONSTRAINT "OrderParcel_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Version 1: R50 base + 35/km to 5 km, 28/km to 30 km, 20.333/km beyond.
-- Weight bands are present but rates are zero: distance-only pricing for now.
INSERT INTO "PricingConfig" (
    "id", "version", "isActive", "currency", "baseFare", "minimumFare",
    "distanceBands", "distanceRates", "freeWeightKg", "weightBands", "weightRates",
    "volumetricDivisor", "quoteTtlMinutes"
) VALUES (
    'pricing_default', 1, true, 'ZAR', 50, 50,
    '[5, 30, null]'::jsonb, '[35, 28, 20.333]'::jsonb,
    5, '[20, 50, null]'::jsonb, '[0, 0, 0]'::jsonb,
    5000, 15
)
ON CONFLICT ("version") DO NOTHING;
