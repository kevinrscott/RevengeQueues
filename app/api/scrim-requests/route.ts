import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewerId = parseInt((session.user as any).id as string, 10);
    if (Number.isNaN(viewerId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    let body: {
      scrimId?: number;
      teamId?: number;
      memberIds?: number[];
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { scrimId, teamId, memberIds } = body;

    if (!scrimId || !teamId) {
      return NextResponse.json(
        { error: "scrimId and teamId are required." },
        { status: 400 }
      );
    }

    const memberIdsArray: number[] = Array.isArray(memberIds)
      ? memberIds
      : [];

    // Load scrim + host team
    const scrim = await prisma.scrim.findUnique({
      where: { id: scrimId },
      include: {
        hostTeam: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!scrim) {
      return NextResponse.json({ error: "Scrim not found." }, { status: 404 });
    }

    if (scrim.status.toLowerCase() !== "open") {
      return NextResponse.json(
        { error: "This scrim is not open for new requests." },
        { status: 400 }
      );
    }

    if (scrim.hostTeamId === teamId) {
      return NextResponse.json(
        { error: "Host team cannot request to join its own scrim." },
        { status: 400 }
      );
    }

    // Load requesting team, check viewer permissions and validate players
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    const viewerMembership = team.memberships.find(
      (m) =>
        m.userId === viewerId &&
        ["owner", "manager"].includes(m.role.toLowerCase())
    );

    if (!viewerMembership) {
      return NextResponse.json(
        {
          error:
            "You must be an owner or manager of this team to send a scrim request.",
        },
        { status: 403 }
      );
    }

    // If memberIds are provided, ensure they belong to this team
    if (memberIdsArray.length > 0) {
      const validMemberIds = new Set(team.memberships.map((m) => m.userId));
      const invalid = memberIdsArray.filter((id) => !validMemberIds.has(id));

      if (invalid.length > 0) {
        return NextResponse.json(
          { error: "One or more selected players are not on this team." },
          { status: 400 }
        );
      }
    }

    // Prevent duplicate pending requests for same scrim+team
    const existing = await prisma.scrimRequest.findFirst({
      where: {
        scrimId,
        teamId,
        status: "pending",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This team already has a pending request for this scrim." },
        { status: 409 }
      );
    }

    // Who should receive the notification? The user who created the scrim.
    const scrimCreatorId = scrim.createdByUserId;

    // Create scrim request + notification in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const scrimRequest = await tx.scrimRequest.create({
        data: {
          scrimId,
          teamId,
          requestedByUserId: viewerId,
          status: "pending",
          participantIds: memberIdsArray,
        },
      });

      const requester = await tx.user.findUnique({
        where: { id: viewerId },
        select: { id: true, username: true },
      });

      const participantInfo = team.memberships
        .filter((m) => memberIdsArray.includes(m.userId))
        .map((m) => ({
          id: m.user.id,
          username: m.user.username,
        }));

      await tx.notification.create({
        data: {
          recipientId: scrimCreatorId,
          type: "SCRIM_REQUEST_RECEIVED",
          title: "New scrim request",
          body: `${
            requester?.username ?? "A team manager"
          } has requested to scrim your team ${
            scrim.hostTeam.name
          } with ${team.name}.`,
          teamId: team.id,
          scrimId: scrim.id,
          scrimRequestId: scrimRequest.id,
          metadata: {
            requesterTeamId: team.id,
            requesterTeamName: team.name,
            hostTeamId: scrim.hostTeam.id,
            hostTeamName: scrim.hostTeam.name,
            scrimId: scrim.id,
            scrimCode: scrim.scrimCode,
            scrimBestOf: scrim.bestOf,
            scrimGamemode: scrim.gamemode,
            scrimMap: scrim.map,
            participantIds: participantInfo.map((p) => p.id),
            participantUsernames: participantInfo.map((p) => p.username),
          },
        },
      });

      return scrimRequest;
    });

    return NextResponse.json({ success: true, requestId: result.id });
  } catch (err) {
    console.error("Error creating scrim request:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}