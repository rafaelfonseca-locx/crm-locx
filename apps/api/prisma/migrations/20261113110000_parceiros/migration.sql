-- CreateEnum
CREATE TYPE "LeadKind" AS ENUM ('PROSPECT', 'PARTNER');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "kind" "LeadKind" NOT NULL DEFAULT 'PROSPECT',
ADD COLUMN     "referredById" INTEGER;

-- CreateIndex
CREATE INDEX "Lead_kind_idx" ON "Lead"("kind");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

