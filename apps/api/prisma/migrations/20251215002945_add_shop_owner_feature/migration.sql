-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShopInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SHOP_OWNER';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "shopEarning" DOUBLE PRECISION,
ADD COLUMN     "shopId" TEXT;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "shopJoinedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "ShopStatus" NOT NULL DEFAULT 'PENDING',
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "gcashNumber" TEXT,
    "paymayaNumber" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopInvitation" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "targetEmail" TEXT,
    "targetProviderId" TEXT,
    "inviteCode" TEXT NOT NULL,
    "message" TEXT,
    "status" "ShopInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopPayout" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "accountInfo" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "referenceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_ownerId_key" ON "Shop"("ownerId");

-- CreateIndex
CREATE INDEX "Shop_status_idx" ON "Shop"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShopInvitation_inviteCode_key" ON "ShopInvitation"("inviteCode");

-- CreateIndex
CREATE INDEX "ShopInvitation_shopId_idx" ON "ShopInvitation"("shopId");

-- CreateIndex
CREATE INDEX "ShopInvitation_inviteCode_idx" ON "ShopInvitation"("inviteCode");

-- CreateIndex
CREATE INDEX "ShopInvitation_targetProviderId_idx" ON "ShopInvitation"("targetProviderId");

-- CreateIndex
CREATE INDEX "ShopPayout_shopId_idx" ON "ShopPayout"("shopId");

-- CreateIndex
CREATE INDEX "ShopPayout_status_idx" ON "ShopPayout"("status");

-- CreateIndex
CREATE INDEX "Booking_shopId_idx" ON "Booking"("shopId");

-- CreateIndex
CREATE INDEX "Provider_shopId_idx" ON "Provider"("shopId");

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopInvitation" ADD CONSTRAINT "ShopInvitation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopInvitation" ADD CONSTRAINT "ShopInvitation_targetProviderId_fkey" FOREIGN KEY ("targetProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPayout" ADD CONSTRAINT "ShopPayout_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
