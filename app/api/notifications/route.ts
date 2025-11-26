import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewerId = parseInt((session.user as any).id as string, 10);
  if (Number.isNaN(viewerId)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const unreadCount = await prisma.notification.count({
    where: {
      recipientId: viewerId,
      readAt: null,
    },
  });

  const teamCount = await prisma.teamMembership.count({
    where: { userId: viewerId },
  });

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: viewerId,
      readAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: {
      team: {
        select: { id: true, name: true, slug: true },
      },
      teamRequest: {
        include: {
          team: {
            select: { id: true, name: true, slug: true },
          },
          createdBy: {
            select: { id: true, username: true },
          },
          user: {
            select: { id: true, username: true },
          },
        },
      },
    },
  });

  const items = notifications.map((n) => {
    const tr = n.teamRequest;
    const team = n.team || tr?.team;
    const createdBy = tr?.createdBy;
    const requestUser = tr?.user;

    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
      readAt: n.readAt,
      teamName: team?.name ?? null,
      teamSlug: team?.slug ?? null,
      fromUserName: createdBy?.username ?? null,
      requestUserName: requestUser?.username ?? null,
      teamRequestId: tr?.id ?? null,
    };
  });

  return NextResponse.json({
    unreadCount,
    notifications: items,
    teamCount,
  });
}