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
      scrim: {
        select: {
          id: true,
          scrimCode: true,
          bestOf: true,
          gamemode: true,
          map: true,
          hostTeam: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      scrimRequest: {
        include: {
          team: {
            select: { id: true, name: true, slug: true },
          },
          requestedBy: {
            select: { id: true, username: true },
          },
        },
      },
    },
  });

  const items = notifications.map((n) => {
    const tr = n.teamRequest;
    const sr = n.scrimRequest;

    const team =
      n.team || tr?.team || sr?.team || null;

    const createdBy = tr?.createdBy || sr?.requestedBy || null;
    const requestUser = tr?.user || null;

    const scrim = n.scrim;
    const hostTeam = scrim?.hostTeam ?? null;

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

      scrimId: scrim?.id ?? null,
      scrimCode: scrim?.scrimCode ?? null,
      scrimBestOf: scrim?.bestOf ?? null,
      scrimGamemode: scrim?.gamemode ?? null,
      scrimMap: scrim?.map ?? null,
      scrimHostTeamName: hostTeam?.name ?? null,
      scrimHostTeamSlug: hostTeam?.slug ?? null,
      scrimRequesterTeamName: sr?.team?.name ?? null,
      scrimRequesterTeamSlug: sr?.team?.slug ?? null,
      scrimRequestId: sr?.id ?? null,
    };
  });

  return NextResponse.json({
    unreadCount,
    notifications: items,
    teamCount,
  });
}