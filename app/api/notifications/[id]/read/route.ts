import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewerId = parseInt((session.user as any).id as string, 10);
  if (Number.isNaN(viewerId)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const { id } = await context.params;
  const notifId = parseInt(id, 10);

  if (!notifId || Number.isNaN(notifId)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }

  const now = new Date();

  // Only update if it belongs to this user
  const updated = await prisma.notification.updateMany({
    where: {
      id: notifId,
      recipientId: viewerId,
      readAt: null,
    },
    data: {
      readAt: now,
    },
  });

  // Get new unread count so you can update the badge
  const unreadCount = await prisma.notification.count({
    where: {
      recipientId: viewerId,
      readAt: null,
    },
  });

  return NextResponse.json({
    success: true,
    affected: updated.count,
    unreadCount,
    id: notifId,
  });
}