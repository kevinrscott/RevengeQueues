-- AlterTable
ALTER TABLE "Scrim" ADD COLUMN     "region" "RegionCode",
ADD COLUMN     "ruleset" TEXT NOT NULL DEFAULT 'Custom',
ADD COLUMN     "teamSize" INTEGER NOT NULL DEFAULT 4;
