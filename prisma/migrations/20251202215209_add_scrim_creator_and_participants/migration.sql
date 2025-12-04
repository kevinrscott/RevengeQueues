/*
  Warnings:

  - Added the required column `createdByUserId` to the `Scrim` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Scrim" ADD COLUMN     "createdByUserId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ScrimRequest" ADD COLUMN     "participantIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateIndex
CREATE INDEX "Scrim_createdByUserId_idx" ON "Scrim"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Scrim" ADD CONSTRAINT "Scrim_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
