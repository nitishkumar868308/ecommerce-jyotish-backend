-- AlterTable
ALTER TABLE "public"."State" ADD COLUMN     "cityRefId" INTEGER,
ADD COLUMN     "countryId" INTEGER,
ADD COLUMN     "countryName" TEXT,
ADD COLUMN     "stateRefId" INTEGER;
