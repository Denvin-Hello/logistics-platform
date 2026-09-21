-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "driverLat" DOUBLE PRECISION,
ADD COLUMN     "driverLng" DOUBLE PRECISION,
ADD COLUMN     "driverLocationUpdatedAt" TIMESTAMP(3);
