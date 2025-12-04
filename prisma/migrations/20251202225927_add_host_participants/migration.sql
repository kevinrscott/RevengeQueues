-- AlterTable
ALTER TABLE "Scrim" ADD COLUMN     "hostParticipantIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
