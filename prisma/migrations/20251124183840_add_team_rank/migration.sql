-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "rankId" INTEGER;

-- CreateIndex
CREATE INDEX "Team_rankId_idx" ON "Team"("rankId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "GameRank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
