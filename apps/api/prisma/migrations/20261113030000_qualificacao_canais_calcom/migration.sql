-- CreateEnum
CREATE TYPE "LeadChannel" AS ENUM ('DEMO', 'WHATSAPP', 'SITE', 'MANUAL');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "billingCycle" "BillingCycle",
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "channel" "LeadChannel" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "contractsRange" TEXT,
ADD COLUMN     "currentTool" TEXT,
ADD COLUMN     "managementRole" TEXT,
ADD COLUMN     "startTimeline" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Activity_externalId_key" ON "Activity"("externalId");

-- CreateIndex
CREATE INDEX "Lead_channel_idx" ON "Lead"("channel");

