-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TEAM_INVITE', 'TEAM_JOIN_REQUEST', 'TEAM_REQUEST_ACCEPTED', 'TEAM_REQUEST_REJECTED', 'SCRIM_REQUEST_RECEIVED', 'SCRIM_REQUEST_ACCEPTED', 'SCRIM_REQUEST_REJECTED', 'GENERIC');

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "teamId" INTEGER,
    "teamRequestId" INTEGER,
    "scrimId" INTEGER,
    "scrimRequestId" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_teamRequestId_fkey" FOREIGN KEY ("teamRequestId") REFERENCES "TeamRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_scrimId_fkey" FOREIGN KEY ("scrimId") REFERENCES "Scrim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_scrimRequestId_fkey" FOREIGN KEY ("scrimRequestId") REFERENCES "ScrimRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
