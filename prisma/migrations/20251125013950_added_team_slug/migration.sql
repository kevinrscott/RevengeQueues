/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Made the column `region` on table `Team` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "slug" TEXT NOT NULL,
ALTER COLUMN "region" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");
