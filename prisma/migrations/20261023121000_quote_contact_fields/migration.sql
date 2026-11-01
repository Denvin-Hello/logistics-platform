-- A confirmed quote must carry every order field without re-reading the client.
ALTER TABLE "Quote"
ADD COLUMN "pickupPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "pickupDate" TEXT,
ADD COLUMN "pickupTime" TEXT,
ADD COLUMN "deliveryName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "deliveryPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "deliveryInstructions" TEXT NOT NULL DEFAULT '';
