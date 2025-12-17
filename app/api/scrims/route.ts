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
      hostTeamId?: number;
      bestOf?: number;
      gamemode?: string;
      map?: string;
      scheduledAt?: string | null;
      hostParticipantIds?: number[];
      teamSize?: number;
      ruleset?: "CDL" | "CUSTOM" | string; // allow raw string from body
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      hostTeamId,
      bestOf,
      gamemode,
      map,
      scheduledAt,
      hostParticipantIds,
      teamSize,
      ruleset,
    } = body;

    if (!hostTeamId || !bestOf || !gamemode?.trim() || !map?.trim()) {
      return NextResponse.json(
        {
          error: "hostTeamId, bestOf, gamemode, and map are required.",
        },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: hostTeamId },
      include: {
        game: true,
        rank: true,
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
      return NextResponse.json(
        { error: "Host team not found." },
        { status: 404 }
      );
    }

    const viewerMembership = team.memberships.find(
      (m) =>
        m.userId === viewerId &&
        ["owner", "manager"].includes(m.role.toLowerCase())
    );

    if (!viewerMembership) {
      return NextResponse.json(
        { error: "You do not have permission to host scrims for this team." },
        { status: 403 }
      );
    }

    // sanitize host participants
    const allowedMemberIds = new Set(team.memberships.map((m) => m.userId));
    const sanitizedHostParticipantIds = (hostParticipantIds ?? []).filter((id) =>
      allowedMemberIds.has(id)
    );

    const scheduledDate =
      scheduledAt && scheduledAt.trim() !== "" ? new Date(scheduledAt) : null;

    // fallbacks in case client didn't send these
    const normalizedTeamSize = teamSize && teamSize > 0 ? teamSize : 4;
    const normalizedRuleset =
      ruleset && ruleset.toUpperCase() === "CUSTOM" ? "CUSTOM" : "CDL";

    const scrim = await prisma.scrim.create({
      data: {
        hostTeamId: team.id,
        bestOf,
        gamemode: gamemode.trim(),
        map: map.trim(),
        scrimCode: null, // host sets later via PATCH
        scheduledAt: scheduledDate,
        status: "open",
        createdByUserId: viewerId,
        hostParticipantIds: sanitizedHostParticipantIds,
        teamSize: normalizedTeamSize,
        ruleset: normalizedRuleset,
        // region: let Prisma/default handle it, or set explicitly if you want
        // region: someRegionValue,
      },
      include: {
        hostTeam: {
          include: {
            game: true,
            rank: true,
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
        },
      },
    });

    return NextResponse.json({
      id: scrim.id,
      bestOf: scrim.bestOf,
      gamemode: scrim.gamemode,
      map: scrim.map,
      scrimCode: scrim.scrimCode,
      scheduledAt: scrim.scheduledAt?.toISOString() ?? null,
      status: scrim.status,
      hostParticipantIds: scrim.hostParticipantIds,

      // 🔽 new fields so client doesn't see undefined
      teamSize: scrim.teamSize,
      ruleset: scrim.ruleset,
      region: scrim.region, // assuming your Prisma model has this

      hostTeam: {
        id: scrim.hostTeam.id,
        name: scrim.hostTeam.name,
        isRecruiting: scrim.hostTeam.isRecruiting,
        logoUrl: scrim.hostTeam.logoUrl,
        game: {
          id: scrim.hostTeam.game.id,
          name: scrim.hostTeam.game.name,
          shortCode: scrim.hostTeam.game.shortCode,
        },
        rank: scrim.hostTeam.rank
          ? {
              id: scrim.hostTeam.rank.id,
              name: scrim.hostTeam.rank.name,
              order: scrim.hostTeam.rank.order,
              gameId: scrim.hostTeam.rank.gameId,
            }
          : null,
        memberships: scrim.hostTeam.memberships.map((m) => ({
          userId: m.userId,
          role: m.role,
          user: {
            id: m.user.id,
            username: m.user.username,
          },
        })),
      },
    });
  } catch (err) {
    console.error("Error creating scrim:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}