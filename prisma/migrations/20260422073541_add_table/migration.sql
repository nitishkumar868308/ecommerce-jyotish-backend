-- CreateTable
CREATE TABLE "public"."AdminAstrologerMessage" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "readByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "readByAstro" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAstrologerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAstrologerMessage_astrologerId_idx" ON "public"."AdminAstrologerMessage"("astrologerId");

-- CreateIndex
CREATE INDEX "AdminAstrologerMessage_createdAt_idx" ON "public"."AdminAstrologerMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."AdminAstrologerMessage" ADD CONSTRAINT "AdminAstrologerMessage_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
