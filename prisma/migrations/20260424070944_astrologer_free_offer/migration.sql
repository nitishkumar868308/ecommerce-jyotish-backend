-- AlterTable
ALTER TABLE "public"."AstrologerChatSession" ADD COLUMN     "freeMinutesGranted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "freeOfferId" INTEGER;

-- CreateTable
CREATE TABLE "public"."AstrologerFreeOffer" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ASTROLOGER',
    "minutesPerSession" INTEGER NOT NULL DEFAULT 0,
    "usesPerUser" INTEGER NOT NULL DEFAULT 1,
    "ratePerMinuteAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AstrologerFreeOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AstrologerFreeOfferUsage" (
    "id" SERIAL NOT NULL,
    "offerId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "usesConsumed" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AstrologerFreeOfferUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AstrologerFreeOffer_astrologerId_idx" ON "public"."AstrologerFreeOffer"("astrologerId");

-- CreateIndex
CREATE INDEX "AstrologerFreeOffer_active_idx" ON "public"."AstrologerFreeOffer"("active");

-- CreateIndex
CREATE INDEX "AstrologerFreeOfferUsage_userId_idx" ON "public"."AstrologerFreeOfferUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AstrologerFreeOfferUsage_offerId_userId_key" ON "public"."AstrologerFreeOfferUsage"("offerId", "userId");

-- AddForeignKey
ALTER TABLE "public"."AstrologerChatSession" ADD CONSTRAINT "AstrologerChatSession_freeOfferId_fkey" FOREIGN KEY ("freeOfferId") REFERENCES "public"."AstrologerFreeOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerFreeOffer" ADD CONSTRAINT "AstrologerFreeOffer_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerFreeOfferUsage" ADD CONSTRAINT "AstrologerFreeOfferUsage_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."AstrologerFreeOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerFreeOfferUsage" ADD CONSTRAINT "AstrologerFreeOfferUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
