import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewerId = parseInt((session.user as any).id as string, 10);
  if (Number.isNaN(viewerId)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  let body: { teamId?: number; targetUserId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { teamId, targetUserId } = body;

  if (!teamId || !targetUserId) {
    return NextResponse.json(
      { error: "teamId and targetUserId are required" },
      { status: 400 }
    );
  }

  if (targetUserId === viewerId) {
    return NextResponse.json(
      { error: "You cannot invite yourself" },
      { status: 400 }
    );
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      memberships: {
        where: {
          userId: viewerId,
        },
      },
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const viewerMembership = team.memberships[0];
  const viewerRole = viewerMembership?.role?.toLowerCase();

  if (!viewerMembership || !["owner", "manager"].includes(viewerRole)) {
    return NextResponse.json(
      { error: "You do not have permission to invite for this team" },
      { status: 403 }
    );
  }

  const targetProfile = await prisma.userGameProfile.findFirst({
    where: {
      userId: targetUserId,
      gameId: team.gameId,
    },
    include: {
      user: true,
    },
  });

  if (!targetProfile) {
    return NextResponse.json(
      { error: "Target user does not have a profile for this game" },
      { status: 400 }
    );
  }

  if (!targetProfile.lookingForTeam) {
    return NextResponse.json(
      { error: "This player is not currently looking for a team" },
      { status: 400 }
    );
  }

  const targetMembershipCount = await prisma.teamMembership.count({
    where: { userId: targetUserId },
  });

  if (targetMembershipCount >= 3) {
    return NextResponse.json(
      { error: "This player is already in the maximum number of teams." },
      { status: 400 }
    );
  }

  const existing = await prisma.teamRequest.findFirst({
    where: {
      teamId,
      userId: targetUserId,
      kind: "invite",
      status: "pending",
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "There is already a pending invite for this player and team" },
      { status: 409 }
    );
  }

  const inviter = await prisma.user.findUnique({
    where: { id: viewerId },
  });

  const result = await prisma.$transaction(async (tx) => {
    const teamRequest = await tx.teamRequest.create({
      data: {
        kind: "invite",
        status: "pending",
        teamId,
        userId: targetUserId,
        createdByUserId: viewerId,
      },
    });

    await tx.notification.create({
      data: {
        recipientId: targetUserId,
        type: "TEAM_INVITE",
        title: "Team Invitation",
        body: `${inviter?.username ?? "A player"} has invited you to join ${team.name}.`,
        teamId: team.id,
        teamRequestId: teamRequest.id,
      },
    });

    return teamRequest;
  });

  return NextResponse.json({ success: true, requestId: result.id });
}