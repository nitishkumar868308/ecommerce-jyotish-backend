/*
  Warnings:

  - A unique constraint covering the columns `[channelSku,locationCode]` on the table `BangaloreIncreffMappingSKU` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."BangaloreIncreffMappingSKU" ADD COLUMN     "locationCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BangaloreIncreffMappingSKU_channelSku_locationCode_key" ON "public"."BangaloreIncreffMappingSKU"("channelSku", "locationCode");
