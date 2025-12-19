-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('TOP_UP', 'PLATFORM_FEE', 'PAYOUT', 'EARNING', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WalletOwnerType" AS ENUM ('PROVIDER', 'SHOP');

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "ownerType" "WalletOwnerType" NOT NULL,
    "providerId" TEXT,
    "shopId" TEXT,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "bookingId" TEXT,
    "payoutId" TEXT,
    "paymentMethod" "PaymentMethod",
    "paymentRef" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "description" TEXT,
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletTransaction_ownerType_providerId_idx" ON "WalletTransaction"("ownerType", "providerId");

-- CreateIndex
CREATE INDEX "WalletTransaction_ownerType_shopId_idx" ON "WalletTransaction"("ownerType", "shopId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");
