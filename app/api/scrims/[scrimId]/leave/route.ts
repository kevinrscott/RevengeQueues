import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";

type RouteContext = { params: Promise<{ scrimId: string }> };

export async function POST(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewerId = parseInt((session.user as any).id as string, 10);
    if (Number.isNaN(viewerId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { scrimId: scrimIdParam } = await context.params;
    const scrimId = Number(scrimIdParam);
    if (!scrimId || Number.isNaN(scrimId)) {
      return NextResponse.json({ error: "Invalid scrim id" }, { status: 400 });
    }

    let body: { teamId?: number } = {};
    try {
      body = await req.json();
    } catch {
    }
    const { teamId } = body;

    const scrim = await prisma.scrim.findUnique({
      where: { id: scrimId },
      include: {
        hostTeam: {
          include: {
            memberships: true,
          },
        },
        requests: {
          where: { status: "accepted" },
          include: {
            team: {
              include: {
                memberships: true,
              },
            },
          },
        },
      },
    });

    if (!scrim) {
      return NextResponse.json({ error: "Scrim not found." }, { status: 404 });
    }

    const hostMembership = scrim.hostTeam.memberships.find(
      (m) => m.userId === viewerId
    );
    if (hostMembership) {
      return NextResponse.json(
        {
          error:
            "Hosts cannot leave their own scrim. Use the disband endpoint instead.",
        },
        { status: 400 }
      );
    }

    let leavingRequest =
      teamId != null
        ? scrim.requests.find((r) => r.teamId === teamId)
        : null;

    if (!leavingRequest) {
      leavingRequest = scrim.requests.find((r) =>
        r.team.memberships.some(
          (m) =>
            m.userId === viewerId &&
            ["owner", "manager"].includes(m.role.toLowerCase())
        )
      );
    }

    if (!leavingRequest) {
      return NextResponse.json(
        {
          error:
            "You are not an owner/manager of any team currently in this scrim.",
        },
        { status: 403 }
      );
    }

    const viewerTeamMembership = leavingRequest.team.memberships.find(
      (m) =>
        m.userId === viewerId &&
        ["owner", "manager"].includes(m.role.toLowerCase())
    );

    if (!viewerTeamMembership) {
      return NextResponse.json(
        { error: "You do not have permission to make this team leave." },
        { status: 403 }
      );
    }

    await prisma.$transaction([
      prisma.scrimRequest.update({
        where: { id: leavingRequest.id },
        data: {
          status: "cancelled",
          participantIds: [],
        },
      }),
      prisma.scrim.update({
        where: { id: scrimId },
        data: {
          status: "open",
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in POST /api/scrims/[scrimId]/leave:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}