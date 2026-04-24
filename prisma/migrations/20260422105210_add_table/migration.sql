-- AlterTable
ALTER TABLE "public"."AstrologerAccount" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."JyotishNotification" (
    "id" SERIAL NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientId" INTEGER,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JyotishNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JyotishNotification_recipientType_recipientId_read_idx" ON "public"."JyotishNotification"("recipientType", "recipientId", "read");

-- CreateIndex
CREATE INDEX "JyotishNotification_createdAt_idx" ON "public"."JyotishNotification"("createdAt");
