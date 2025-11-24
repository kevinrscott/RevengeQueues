/*
  Warnings:

  - You are about to drop the column `rank` on the `UserGameProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserGameProfile" DROP COLUMN "rank",
ADD COLUMN     "rankId" INTEGER;

-- CreateTable
CREATE TABLE "GameRank" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "iconUrl" TEXT,
    "gameId" INTEGER NOT NULL,

    CONSTRAINT "GameRank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameRank_gameId_idx" ON "GameRank"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRank_gameId_name_key" ON "GameRank"("gameId", "name");

-- CreateIndex
CREATE INDEX "UserGameProfile_rankId_idx" ON "UserGameProfile"("rankId");

-- AddForeignKey
ALTER TABLE "GameRank" ADD CONSTRAINT "GameRank_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameProfile" ADD CONSTRAINT "UserGameProfile_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "GameRank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
