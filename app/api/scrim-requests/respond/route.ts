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

    let body: { scrimRequestId?: number; action?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { scrimRequestId, action } = body;

    if (!scrimRequestId || (action !== "accept" && action !== "reject")) {
      return NextResponse.json(
        { error: "scrimRequestId and action ('accept' | 'reject') are required." },
        { status: 400 }
      );
    }

    const scrimRequest = await prisma.scrimRequest.findUnique({
      where: { id: scrimRequestId },
      include: {
        scrim: {
          include: {
            hostTeam: {
              include: {
                memberships: true,
              },
            },
          },
        },
        team: true,
        requestedBy: {
          select: { id: true, username: true },
        },
      },
    });

    if (!scrimRequest) {
      return NextResponse.json({ error: "Scrim request not found." }, { status: 404 });
    }

    if (scrimRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This scrim request has already been processed." },
        { status: 400 }
      );
    }

    const scrim = scrimRequest.scrim;
    const hostTeam = scrim.hostTeam;

    // Only owners/managers of host team can respond
    const hostMembership = hostTeam.memberships.find(
      (m) =>
        m.userId === viewerId &&
        ["owner", "manager"].includes(m.role.toLowerCase())
    );

    if (!hostMembership) {
      return NextResponse.json(
        {
          error:
            "You must be an owner or manager of the host team to respond to this scrim request.",
        },
        { status: 403 }
      );
    }

    const now = new Date();
    const isAccept = action === "accept";

    const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.scrimRequest.update({
      where: { id: scrimRequestId },
      data: {
        status: isAccept ? "accepted" : "rejected",
        respondedAt: now,
        codeSent: isAccept ? true : scrimRequest.codeSent,
      },
      include: {
        scrim: {
          include: {
            hostTeam: {
              include: {
                memberships: true,
              },
            },
          },
        },
        team: true,
        requestedBy: true,
      },
    });

    // Mark the original "SCRIM_REQUEST_RECEIVED" notification as read
    await tx.notification.updateMany({
      where: {
        scrimRequestId,
        recipientId: viewerId,
        readAt: null,
      },
      data: {
        readAt: now,
      },
    });

    // If accepted, mark scrim as "matched" so no one else can request it
    if (isAccept) {
      await tx.scrim.update({
        where: { id: updated.scrimId },
        data: {
          status: "matched",
        },
      });
    }

    const notifType = isAccept
      ? "SCRIM_REQUEST_ACCEPTED"
      : "SCRIM_REQUEST_REJECTED";

    const hostTeamName = updated.scrim.hostTeam.name;
    const requesterTeamName = updated.team.name;
    const scrimCode = updated.scrim.scrimCode;

    const bodyText = isAccept
      ? `Your scrim request for ${hostTeamName} with ${requesterTeamName} was accepted.`
      : `Your scrim request for ${hostTeamName} with ${requesterTeamName} was rejected.`;

    await tx.notification.create({
      data: {
        recipientId: updated.requestedByUserId,
        type: notifType as any,
        title: isAccept ? "Scrim request accepted" : "Scrim request rejected",
        body: bodyText,
        teamId: updated.teamId,
        scrimId: updated.scrimId,
        scrimRequestId: updated.id,
        metadata: {
          scrimId: updated.scrimId,
          scrimCode,
          hostTeamId: updated.scrim.hostTeamId,
          hostTeamName,
          requesterTeamId: updated.teamId,
          requesterTeamName,
          accepted: isAccept,
          respondedAt: now.toISOString(),
        },
      },
    });

    return updated;
  });

    return NextResponse.json({
      success: true,
      status: result.status,
    });
  } catch (err) {
    console.error("Error responding to scrim request:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}