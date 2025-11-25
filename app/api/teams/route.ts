import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";
import { slugify } from "@/app/lib/slugify";
import { assertCleanName, assertCleanText } from "@/app/lib/moderation";
import { Prisma } from "@prisma/client";

const VALID_REGIONS = ["NA", "EU", "SA", "AS", "OC"] as const;
type RegionCode = (typeof VALID_REGIONS)[number];

const MAX_TEAMS_PER_USER = 3;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt((session.user as any).id as string, 10);

  const body = await req.json();
  const { name, region, isRecruiting, bio, rankId, logoUrl } = body as {
    name: string;
    region: RegionCode;
    isRecruiting?: boolean;
    bio?: string | null;
    rankId?: number | null;
    logoUrl?: string | null;
  };

  if (!name || !region) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!VALID_REGIONS.includes(region)) {
    return NextResponse.json(
      { error: "Invalid region" },
      { status: 400 }
    );
  }

  try {
    assertCleanName("Team name", name, { min: 3, max: 24 });
    assertCleanText("Team bio", bio);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Invalid team data." },
      { status: 400 }
    );
  }

  const membershipCount = await prisma.teamMembership.count({
    where: { userId },
  });

  if (membershipCount >= MAX_TEAMS_PER_USER) {
    return NextResponse.json(
      {
        error: `You can only be a member of up to ${MAX_TEAMS_PER_USER} teams.`,
      },
      { status: 400 }
    );
  }

  const profile = await prisma.userGameProfile.findFirst({
    where: { userId },
    orderBy: { id: "asc" },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "You must have a game profile before creating a team." },
      { status: 400 }
    );
  }

  const gameId = profile.gameId;
  const slug = slugify(name);

  const existing = await prisma.team.findFirst({
    where: { slug },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A team with that name already exists. Please pick another name." },
      { status: 400 }
    );
  }

  try {
    const team = await prisma.team.create({
      data: {
        name,
        slug,
        region,
        gameId,
        isRecruiting: isRecruiting ?? false,
        bio: bio ?? null,
        logoUrl: logoUrl ?? null,
        rankId: rankId ?? null,
        memberships: {
          create: {
            userId,
            role: "Owner",
          },
        },
      },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (err: any) {
    console.error("Create team error:", err);

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "A team with that name already exists. Please pick another name.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}