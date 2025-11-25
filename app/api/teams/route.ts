import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";
import { slugify } from "@/app/lib/slugify";

const VALID_REGIONS = ["NA", "EU", "SA", "AS", "OC"] as const;
type RegionCode = (typeof VALID_REGIONS)[number];

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

  // Get current game from user profile
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
  } catch (err) {
    console.error("Create team error:", err);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}