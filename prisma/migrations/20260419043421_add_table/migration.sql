-- CreateEnum
CREATE TYPE "public"."AdBookingStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ProfileEditRequestStatus" AS ENUM ('PENDING', 'PARTIALLY_APPROVED', 'APPROVED', 'REJECTED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('ID_PROOF', 'CERTIFICATE');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('PENALTY', 'PAYMENT');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED', 'COMPLETED', 'REFUND');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."PromoDiscountType" AS ENUM ('FLAT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "public"."PromoAppliesTo" AS ENUM ('ALL_USERS', 'SPECIFIC_USERS');

-- CreateEnum
CREATE TYPE "public"."ReviewStatusBlog" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "public"."AdjustmentType" AS ENUM ('SHIPPING', 'NETWORK_FEE', 'ITEM_ADD', 'ITEM_REMOVE', 'DISCOUNT', 'PENALTY', 'TAX', 'MANUAL', 'ITEM_SHIPPING');

-- CreateEnum
CREATE TYPE "public"."AdjustmentImpact" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "public"."AdjustmentStatus" AS ENUM ('PENDING', 'PAID', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PenaltyStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "public"."ChatSessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'ENDED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "address" TEXT,
    "gender" "public"."Gender",
    "phone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileImage" TEXT,
    "city" TEXT,
    "country" TEXT,
    "pincode" TEXT,
    "state" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'LOCAL',
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WalletTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Header" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" TEXT,
    "platform" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hsn" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subcategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "offerId" INTEGER,
    "platform" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subcategoryId" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "slug" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "color" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" TEXT,
    "size" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stock" TEXT,
    "categoryId" INTEGER,
    "short" TEXT,
    "offerId" INTEGER,
    "otherCountriesPrice" TEXT,
    "image" TEXT[],
    "isDefault" JSONB,
    "bulkPrice" TEXT,
    "minQuantity" TEXT,
    "barCode" TEXT,
    "MRP" TEXT,
    "platform" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dimension" JSONB,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductVariation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variationName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" TEXT,
    "stock" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "offerId" INTEGER,
    "otherCountriesPrice" TEXT,
    "image" TEXT[],
    "short" TEXT,
    "bulkPrice" TEXT,
    "minQuantity" TEXT,
    "barCode" TEXT,
    "MRP" TEXT,
    "dimension" JSONB,

    CONSTRAINT "ProductVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attribute" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "values" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Offer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" JSONB NOT NULL,
    "type" JSONB NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CountryPricing" (
    "id" SERIAL NOT NULL,
    "country" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currencySymbol" TEXT,
    "conversionRate" DOUBLE PRECISION,

    CONSTRAINT "CountryPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cart" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerItem" DOUBLE PRECISION NOT NULL,
    "currencySymbol" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" TEXT,
    "userId" INTEGER,
    "selectedCountry" TEXT,
    "currency" TEXT,
    "is_buy" BOOLEAN DEFAULT false,
    "bulkMinQty" INTEGER,
    "bulkPrice" DOUBLE PRECISION,
    "offerApplied" BOOLEAN DEFAULT false,
    "productOfferApplied" BOOLEAN DEFAULT false,
    "productOfferDiscount" DOUBLE PRECISION,
    "productOffer" JSONB,
    "productOfferId" INTEGER,
    "barCode" TEXT,
    "purchasePlatform" TEXT DEFAULT 'website',

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Address" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "landmark" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,
    "customType" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "image" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketLink" (
    "id" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CountryTax" (
    "id" SERIAL NOT NULL,
    "country" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "generalTax" DOUBLE PRECISION,
    "gstTax" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT,
    "countryCode" TEXT,

    CONSTRAINT "CountryTax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VideoStory" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContactMessage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'website',
    "readByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "readByUser" BOOLEAN NOT NULL DEFAULT true,
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageReply" (
    "id" SERIAL NOT NULL,
    "contactMessageId" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "readByUser" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MessageReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Orders" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "shippingName" TEXT,
    "shippingPhone" TEXT,
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingPincode" TEXT,
    "billingName" TEXT,
    "billingPhone" TEXT,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPincode" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION,
    "shippingCharges" DOUBLE PRECISION,
    "taxAmount" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderNumber" TEXT,
    "paymentCurrency" TEXT,
    "orderBy" TEXT,
    "donationAmount" DOUBLE PRECISION,
    "donationCampaignId" INTEGER,
    "note" TEXT,
    "promoCode" TEXT,
    "trackingLink" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "locationCode" TEXT,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShippingPricing" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "code" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "currencySymbol" TEXT,
    "type" TEXT,

    CONSTRAINT "ShippingPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."State" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WareHouse" (
    "id" SERIAL NOT NULL,
    "state" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "contact" TEXT,
    "fulfillmentWarehouseId" INTEGER,

    CONSTRAINT "WareHouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WarehouseTransfer" (
    "id" SERIAL NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT,
    "productName" TEXT NOT NULL,
    "variationName" TEXT,
    "price" TEXT NOT NULL,
    "MRP" TEXT NOT NULL,
    "FNSKU" TEXT NOT NULL,
    "entries" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sku" TEXT,

    CONSTRAINT "WarehouseTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WarehouseDispatch" (
    "id" SERIAL NOT NULL,
    "entries" JSONB NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "totalFNSKU" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dimensions" JSONB,
    "shippingId" TEXT,
    "trackingId" TEXT,
    "trackingLink" TEXT,

    CONSTRAINT "WarehouseDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DelhiWarehouseStock" (
    "id" SERIAL NOT NULL,
    "dispatchId" INTEGER NOT NULL,
    "shippingId" TEXT NOT NULL,
    "trackingId" TEXT,
    "trackingLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "variationId" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,

    CONSTRAINT "DelhiWarehouseStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" INTEGER NOT NULL,
    "receiverRole" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Banner" (
    "id" SERIAL NOT NULL,
    "text" TEXT,
    "image" TEXT,
    "platform" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "link" TEXT,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BannerCountry" (
    "id" SERIAL NOT NULL,
    "bannerId" INTEGER NOT NULL,
    "countryCode" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "BannerCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BannerState" (
    "id" SERIAL NOT NULL,
    "bannerId" INTEGER NOT NULL,
    "stateId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "BannerState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PromoCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appliesTo" "public"."PromoAppliesTo" NOT NULL,
    "discountType" "public"."PromoDiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTill" TIMESTAMP(3) NOT NULL,
    "eligibleUsers" JSONB,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PromoUser" (
    "id" SERIAL NOT NULL,
    "promoId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 1,
    "orderId" INTEGER NOT NULL,
    "discountAmount" DOUBLE PRECISION,
    "subtotal" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PromoUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DonationCampaign" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amounts" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DonationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserDonation" (
    "id" SERIAL NOT NULL,
    "userName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "donatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "donationCampaignId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "userId" INTEGER,

    CONSTRAINT "UserDonation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reviews" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userName" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT,

    CONSTRAINT "Reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BangaloreIncreffOrder" (
    "id" SERIAL NOT NULL,
    "dispatchId" INTEGER NOT NULL,
    "orderCode" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BangaloreIncreffOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Duration" (
    "id" SERIAL NOT NULL,
    "minutes" INTEGER NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Duration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Service" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "shortDesc" TEXT,
    "longDesc" TEXT,
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceDuration" (
    "id" SERIAL NOT NULL,
    "durationId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Astrologer" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "displayName" TEXT,
    "profileImage" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "service" TEXT,
    "specialty" TEXT,
    "userId" INTEGER,

    CONSTRAINT "Astrologer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AstrologerDocument" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AstrologerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Blog" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "excerpt" TEXT,
    "image" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorImage" TEXT,
    "readTime" INTEGER,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlogReviews" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userName" TEXT NOT NULL,
    "blogId" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "status" "public"."ReviewStatusBlog" NOT NULL DEFAULT 'pending',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogReviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordReset" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_adjustments" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "adjustmentType" "public"."AdjustmentType" NOT NULL,
    "impact" "public"."AdjustmentImpact" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" VARCHAR(255),
    "status" "public"."AdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentTxnId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "manualType" VARCHAR(200),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "order_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AstrologerAccount" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gender" "public"."Gender",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "countryCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneLocal" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "displayName" TEXT,
    "isRejected" BOOLEAN NOT NULL DEFAULT false,
    "rejectReason" TEXT,
    "revenueAdmin" DOUBLE PRECISION,
    "revenueAstrologer" DOUBLE PRECISION,
    "gst" DOUBLE PRECISION,
    "isTop" BOOLEAN NOT NULL DEFAULT false,
    "topRank" INTEGER,
    "password" TEXT,
    "credentialsSent" BOOLEAN NOT NULL DEFAULT false,
    "isBusy" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AstrologerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdCampaignConfig" (
    "id" SERIAL NOT NULL,
    "capacityPerDay" INTEGER NOT NULL DEFAULT 50,
    "pricePerDay" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "homepageDisplayCount" INTEGER NOT NULL DEFAULT 3,
    "consultSliderDisplayCount" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaignConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdBooking" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "status" "public"."AdBookingStatus" NOT NULL DEFAULT 'PAID',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfileEditRequest" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "overallStatus" "public"."ProfileEditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AstrologerPenalty" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "settlement" DOUBLE PRECISION,
    "paid" DOUBLE PRECISION,
    "status" "public"."PenaltyStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "AstrologerPenalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AstrologerProfile" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "experience" INTEGER,
    "bio" TEXT,
    "image" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "languages" TEXT[],
    "specializations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idProofType" TEXT,
    "idProofValue" TEXT,

    CONSTRAINT "AstrologerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AstrologerService" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "serviceName" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "currencySymbol" TEXT NOT NULL,

    CONSTRAINT "AstrologerService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AstrologerExtraDocument" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AstrologerExtraDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AstrologerVerificationDocument" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AstrologerVerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AstrologerTransaction" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "AstrologerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Certificate" (
    "id" SERIAL NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BangaloreIncreffInventory" (
    "id" SERIAL NOT NULL,
    "locationCode" TEXT NOT NULL,
    "channelSkuCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "minExpiry" TEXT,
    "channelSerialNo" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientSkuId" TEXT,

    CONSTRAINT "BangaloreIncreffInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BangaloreIncreffMappingSKU" (
    "id" SERIAL NOT NULL,
    "channelSku" TEXT NOT NULL,
    "ourSku" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BangaloreIncreffMappingSKU_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Country" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "iso3" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "numeric_code" TEXT NOT NULL,
    "phonecode" TEXT NOT NULL,
    "capital" TEXT,
    "currency" TEXT,
    "currency_name" TEXT,
    "currency_symbol" TEXT,
    "nationality" TEXT,
    "postal_code_format" TEXT,
    "postal_code_regex" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emoji" TEXT,
    "emojiU" TEXT,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StateCountry" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country_id" INTEGER,
    "country_code" TEXT,
    "country_name" TEXT,
    "iso2" TEXT,
    "iso3166_2" TEXT,
    "fips_code" TEXT,
    "type" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StateCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CityCountry" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "state_id" INTEGER NOT NULL,
    "state_code" TEXT NOT NULL,
    "state_name" TEXT NOT NULL,
    "country_id" INTEGER NOT NULL,
    "country_code" TEXT NOT NULL,
    "country_name" TEXT NOT NULL,
    "latitude" TEXT NOT NULL,
    "longitude" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CityCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BangaloreIncreffPackOrder" (
    "id" SERIAL NOT NULL,
    "orderCode" TEXT NOT NULL,
    "shipmentId" INTEGER NOT NULL,
    "locationCode" TEXT NOT NULL,
    "shipmentCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PACKED',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BangaloreIncreffPackOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AstrologerChatSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "astrologerId" INTEGER NOT NULL,
    "serviceId" INTEGER,
    "pricePerMinute" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "status" "public"."ChatSessionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pauseGraceExpiry" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "minutesBilled" INTEGER NOT NULL DEFAULT 0,
    "totalCharged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "astrologerEarning" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adminEarning" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastTickAt" TIMESTAMP(3),

    CONSTRAINT "AstrologerChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AstrologerChatMessage" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "text" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AstrologerChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_CategoryStates" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CategoryStates_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_ProductTags" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProductTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_VariationTags" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_VariationTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_ProductOffers" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductOffers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_SubcategoryStates" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SubcategoryStates_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_idx" ON "public"."WalletTransaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "public"."Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "public"."Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariation_sku_key" ON "public"."ProductVariation"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "CountryPricing_code_key" ON "public"."CountryPricing"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Orders_orderNumber_key" ON "public"."Orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Orders_invoiceNumber_key" ON "public"."Orders"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DelhiWarehouseStock_dispatchId_productId_variationId_key" ON "public"."DelhiWarehouseStock"("dispatchId", "productId", "variationId");

-- CreateIndex
CREATE UNIQUE INDEX "BannerCountry_bannerId_countryCode_key" ON "public"."BannerCountry"("bannerId", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "BannerState_bannerId_stateId_key" ON "public"."BannerState"("bannerId", "stateId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "public"."PromoCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PromoUser_promoId_orderId_key" ON "public"."PromoUser"("promoId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_slug_key" ON "public"."Blog"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogReviews_userId_blogId_key" ON "public"."BlogReviews"("userId", "blogId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "public"."PasswordReset"("token");

-- CreateIndex
CREATE UNIQUE INDEX "order_adjustments_paymentTxnId_key" ON "public"."order_adjustments"("paymentTxnId");

-- CreateIndex
CREATE UNIQUE INDEX "AstrologerAccount_email_key" ON "public"."AstrologerAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AstrologerAccount_phone_key" ON "public"."AstrologerAccount"("phone");

-- CreateIndex
CREATE INDEX "AdBooking_startDate_endDate_idx" ON "public"."AdBooking"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "AdBooking_status_idx" ON "public"."AdBooking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AstrologerProfile_astrologerId_key" ON "public"."AstrologerProfile"("astrologerId");

-- CreateIndex
CREATE UNIQUE INDEX "BangaloreIncreffInventory_locationCode_channelSkuCode_key" ON "public"."BangaloreIncreffInventory"("locationCode", "channelSkuCode");

-- CreateIndex
CREATE UNIQUE INDEX "BangaloreIncreffPackOrder_orderCode_shipmentId_key" ON "public"."BangaloreIncreffPackOrder"("orderCode", "shipmentId");

-- CreateIndex
CREATE INDEX "AstrologerChatSession_userId_idx" ON "public"."AstrologerChatSession"("userId");

-- CreateIndex
CREATE INDEX "AstrologerChatSession_astrologerId_idx" ON "public"."AstrologerChatSession"("astrologerId");

-- CreateIndex
CREATE INDEX "AstrologerChatSession_status_idx" ON "public"."AstrologerChatSession"("status");

-- CreateIndex
CREATE INDEX "AstrologerChatMessage_sessionId_idx" ON "public"."AstrologerChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "_CategoryStates_B_index" ON "public"."_CategoryStates"("B");

-- CreateIndex
CREATE INDEX "_ProductTags_B_index" ON "public"."_ProductTags"("B");

-- CreateIndex
CREATE INDEX "_VariationTags_B_index" ON "public"."_VariationTags"("B");

-- CreateIndex
CREATE INDEX "_ProductOffers_B_index" ON "public"."_ProductOffers"("B");

-- CreateIndex
CREATE INDEX "_SubcategoryStates_B_index" ON "public"."_SubcategoryStates"("B");

-- AddForeignKey
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "public"."Subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductVariation" ADD CONSTRAINT "ProductVariation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductVariation" ADD CONSTRAINT "ProductVariation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketLink" ADD CONSTRAINT "MarketLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CountryTax" ADD CONSTRAINT "CountryTax_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageReply" ADD CONSTRAINT "MessageReply_contactMessageId_fkey" FOREIGN KEY ("contactMessageId") REFERENCES "public"."ContactMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Orders" ADD CONSTRAINT "Orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WareHouse" ADD CONSTRAINT "WareHouse_fulfillmentWarehouseId_fkey" FOREIGN KEY ("fulfillmentWarehouseId") REFERENCES "public"."WareHouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BannerCountry" ADD CONSTRAINT "BannerCountry_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "public"."Banner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BannerState" ADD CONSTRAINT "BannerState_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "public"."Banner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BannerState" ADD CONSTRAINT "BannerState_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "public"."State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PromoUser" ADD CONSTRAINT "PromoUser_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "public"."PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDonation" ADD CONSTRAINT "UserDonation_donationCampaignId_fkey" FOREIGN KEY ("donationCampaignId") REFERENCES "public"."DonationCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceDuration" ADD CONSTRAINT "ServiceDuration_durationId_fkey" FOREIGN KEY ("durationId") REFERENCES "public"."Duration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerDocument" ADD CONSTRAINT "AstrologerDocument_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."Astrologer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_adjustments" ADD CONSTRAINT "order_adjustments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdBooking" ADD CONSTRAINT "AdBooking_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileEditRequest" ADD CONSTRAINT "ProfileEditRequest_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerPenalty" ADD CONSTRAINT "AstrologerPenalty_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerProfile" ADD CONSTRAINT "AstrologerProfile_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerService" ADD CONSTRAINT "AstrologerService_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerExtraDocument" ADD CONSTRAINT "AstrologerExtraDocument_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerVerificationDocument" ADD CONSTRAINT "AstrologerVerificationDocument_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Certificate" ADD CONSTRAINT "Certificate_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StateCountry" ADD CONSTRAINT "StateCountry_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CityCountry" ADD CONSTRAINT "CityCountry_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CityCountry" ADD CONSTRAINT "CityCountry_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."StateCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerChatSession" ADD CONSTRAINT "AstrologerChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerChatSession" ADD CONSTRAINT "AstrologerChatSession_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "public"."AstrologerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AstrologerChatMessage" ADD CONSTRAINT "AstrologerChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AstrologerChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CategoryStates" ADD CONSTRAINT "_CategoryStates_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CategoryStates" ADD CONSTRAINT "_CategoryStates_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ProductTags" ADD CONSTRAINT "_ProductTags_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ProductTags" ADD CONSTRAINT "_ProductTags_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_VariationTags" ADD CONSTRAINT "_VariationTags_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."ProductVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_VariationTags" ADD CONSTRAINT "_VariationTags_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ProductOffers" ADD CONSTRAINT "_ProductOffers_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ProductOffers" ADD CONSTRAINT "_ProductOffers_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SubcategoryStates" ADD CONSTRAINT "_SubcategoryStates_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SubcategoryStates" ADD CONSTRAINT "_SubcategoryStates_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
