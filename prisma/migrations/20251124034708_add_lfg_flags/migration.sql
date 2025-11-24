-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "isRecruiting" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserGameProfile" ADD COLUMN     "lookingForTeam" BOOLEAN NOT NULL DEFAULT false;
