-- AlterTable
ALTER TABLE "public"."AstrologerChatSession" ADD COLUMN     "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "secondsBilled" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."AstrologerReview" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AstrologerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AstrologerReview_sessionId_key" ON "public"."AstrologerReview"("sessionId");

-- CreateIndex
CREATE INDEX "AstrologerReview_astrologerId_idx" ON "public"."AstrologerReview"("astrologerId");

-- CreateIndex
CREATE INDEX "AstrologerReview_userId_idx" ON "public"."AstrologerReview"("userId");

-- AddForeignKey
ALTER TABLE "public"."AstrologerReview" ADD CONSTRAINT "AstrologerReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AstrologerChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerReview" ADD CONSTRAINT "AstrologerReview_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerReview" ADD CONSTRAINT "AstrologerReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
