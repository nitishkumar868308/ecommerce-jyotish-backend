-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "bulkPricingTiers" JSONB;

-- AlterTable
ALTER TABLE "public"."ProductVariation" ADD COLUMN     "attributeCombo" JSONB,
ADD COLUMN     "bulkPricingTiers" JSONB;
