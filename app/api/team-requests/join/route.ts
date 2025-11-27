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

  let body: { teamId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { teamId } = body;

  if (!teamId) {
    return NextResponse.json(
      { error: "teamId is required" },
      { status: 400 }
    );
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      memberships: true,
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (!team.isRecruiting) {
    return NextResponse.json(
      { error: "This team is not currently recruiting." },
      { status: 400 }
    );
  }

  const isAlreadyMember = team.memberships.some((m) => m.userId === viewerId);
  if (isAlreadyMember) {
    return NextResponse.json(
      { error: "You are already a member of this team." },
      { status: 400 }
    );
  }

  const membershipCount = await prisma.teamMembership.count({
    where: { userId: viewerId },
  });

  if (membershipCount >= 3) {
    return NextResponse.json(
      { error: "You are already in the maximum of 3 teams." },
      { status: 400 }
    );
  }

  const existing = await prisma.teamRequest.findFirst({
    where: {
      teamId,
      userId: viewerId,
      kind: "join_request",
      status: "pending",
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending join request for this team." },
      { status: 409 }
    );
  }

  const requester = await prisma.user.findUnique({
    where: { id: viewerId },
  });

  const managerMemberships = team.memberships.filter((m) =>
    ["owner", "manager"].includes(m.role.toLowerCase())
  );

  const result = await prisma.$transaction(async (tx) => {
    const teamRequest = await tx.teamRequest.create({
      data: {
        kind: "join_request",
        status: "pending",
        teamId,
        userId: viewerId,
        createdByUserId: viewerId,
      },
    });

    if (managerMemberships.length > 0) {
      const actorName = requester?.username ?? "A player";

      await tx.notification.createMany({
        data: managerMemberships.map((m) => ({
          recipientId: m.userId,
          type: "TEAM_JOIN_REQUEST",
          title: "New Join Request",
          body: `${actorName} requested to join ${team.name}.`,
          teamId: team.id,
          teamRequestId: teamRequest.id,
        })),
      });
    }

    return teamRequest;
  });

  return NextResponse.json({ success: true, requestId: result.id });
}