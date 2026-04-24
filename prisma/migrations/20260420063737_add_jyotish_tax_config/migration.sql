-- CreateTable
CREATE TABLE "public"."JyotishTaxConfig" (
    "id" SERIAL NOT NULL,
    "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JyotishTaxConfig_pkey" PRIMARY KEY ("id")
);
