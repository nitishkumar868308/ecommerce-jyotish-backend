-- AlterEnum
ALTER TYPE "public"."PaymentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "public"."Orders" ADD COLUMN     "paymentError" TEXT;
