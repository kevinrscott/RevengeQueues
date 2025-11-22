/*
  Warnings:

  - The `region` column on the `Team` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `region` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "RegionCode" AS ENUM ('NA', 'EU', 'SA', 'AS', 'OC');

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "region",
ADD COLUMN     "region" "RegionCode";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "region",
ADD COLUMN     "region" "RegionCode";
