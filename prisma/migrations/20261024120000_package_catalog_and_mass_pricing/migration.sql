-- Catalog item snapshots on parcels + chargeable-mass pricing.
ALTER TABLE "OrderParcel"
ADD COLUMN     "catalogCategory" TEXT,
ADD COLUMN     "catalogSubcategory" TEXT,
ADD COLUMN     "itemKey" TEXT,
ADD COLUMN     "itemLabel" TEXT;

ALTER TABLE "PricingConfig"
ALTER COLUMN "freeWeightKg" SET DEFAULT 1;

-- Version 2: first 1 kg is included, then R15/kg on chargeable mass.
UPDATE "PricingConfig" SET "isActive" = false WHERE "isActive" = true;

INSERT INTO "PricingConfig" (
    "id", "version", "isActive", "currency", "baseFare", "minimumFare",
    "distanceBands", "distanceRates", "freeWeightKg", "weightBands", "weightRates",
    "volumetricDivisor", "quoteTtlMinutes"
) VALUES (
    'pricing_default_v2', 2, true, 'ZAR', 50, 50,
    '[5, 30, null]'::jsonb, '[35, 28, 20.333]'::jsonb,
    1, '[null]'::jsonb, '[15]'::jsonb,
    5000, 15
)
ON CONFLICT ("version") DO UPDATE SET
    "isActive" = true,
    "baseFare" = EXCLUDED."baseFare",
    "minimumFare" = EXCLUDED."minimumFare",
    "distanceBands" = EXCLUDED."distanceBands",
    "distanceRates" = EXCLUDED."distanceRates",
    "freeWeightKg" = EXCLUDED."freeWeightKg",
    "weightBands" = EXCLUDED."weightBands",
    "weightRates" = EXCLUDED."weightRates",
    "volumetricDivisor" = EXCLUDED."volumetricDivisor",
    "quoteTtlMinutes" = EXCLUDED."quoteTtlMinutes";
