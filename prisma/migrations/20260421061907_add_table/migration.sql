/*
  Warnings:

  - You are about to drop the column `barCode` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `bulkMinQty` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `bulkPrice` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `currencySymbol` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `offerApplied` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerItem` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `productOffer` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `productOfferApplied` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `productOfferDiscount` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `productOfferId` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `selectedCountry` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `items` on the `Orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Cart" DROP COLUMN "barCode",
DROP COLUMN "bulkMinQty",
DROP COLUMN "bulkPrice",
DROP COLUMN "currency",
DROP COLUMN "currencySymbol",
DROP COLUMN "image",
DROP COLUMN "offerApplied",
DROP COLUMN "pricePerItem",
DROP COLUMN "productName",
DROP COLUMN "productOffer",
DROP COLUMN "productOfferApplied",
DROP COLUMN "productOfferDiscount",
DROP COLUMN "productOfferId",
DROP COLUMN "selectedCountry",
DROP COLUMN "totalPrice";

-- AlterTable
ALTER TABLE "public"."Orders" DROP COLUMN "items",
ADD COLUMN     "baseTotalAmount" DOUBLE PRECISION,
ADD COLUMN     "billingCountry" TEXT,
ADD COLUMN     "conversionRate" DOUBLE PRECISION,
ADD COLUMN     "currencySymbol" TEXT,
ADD COLUMN     "fiscalYear" INTEGER,
ADD COLUMN     "invoiceSeq" INTEGER,
ADD COLUMN     "paymentPaidAt" TIMESTAMP(3),
ADD COLUMN     "paymentTxnId" TEXT,
ADD COLUMN     "promoDiscount" DOUBLE PRECISION,
ADD COLUMN     "shippingCountry" TEXT,
ADD COLUMN     "userEmail" TEXT,
ADD COLUMN     "userName" TEXT,
ADD COLUMN     "userPhone" TEXT;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "offerIgnoreAttributes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT,
    "productName" TEXT NOT NULL,
    "variationName" TEXT,
    "sku" TEXT,
    "fnsku" TEXT,
    "barCode" TEXT,
    "image" TEXT,
    "quantity" INTEGER NOT NULL,
    "paidQty" INTEGER NOT NULL,
    "freeQty" INTEGER NOT NULL DEFAULT 0,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "pricePerItem" DOUBLE PRECISION NOT NULL,
    "bulkApplied" BOOLEAN NOT NULL DEFAULT false,
    "bulkMinQty" INTEGER,
    "bulkPrice" DOUBLE PRECISION,
    "offerApplied" BOOLEAN NOT NULL DEFAULT false,
    "offerId" INTEGER,
    "offerName" TEXT,
    "productOfferDiscount" DOUBLE PRECISION,
    "savedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "groupKey" TEXT,
    "currency" TEXT,
    "currencySymbol" TEXT,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceSequence" (
    "fiscalYear" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("fiscalYear")
);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "public"."OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "public"."Cart"("userId");

-- CreateIndex
CREATE INDEX "Cart_productId_idx" ON "public"."Cart"("productId");

-- CreateIndex
CREATE INDEX "Orders_userId_idx" ON "public"."Orders"("userId");

-- CreateIndex
CREATE INDEX "Orders_fiscalYear_invoiceSeq_idx" ON "public"."Orders"("fiscalYear", "invoiceSeq");

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
