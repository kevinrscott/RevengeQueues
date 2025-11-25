import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";
import { assertCleanName, assertCleanText } from "@/app/lib/moderation";
import { Prisma } from "@prisma/client";

const VALID_REGIONS = ["NA", "EU", "SA", "AS", "OC"] as const;
type RegionCode = (typeof VALID_REGIONS)[number];

type RouteParamsPromise = Promise<{ slug: string }>;

export async function PATCH(
  req: Request,
  { params }: { params: RouteParamsPromise }
) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt((session.user as any).id as string, 10);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const { slug } = await params;

  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      memberships: true,
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const ownerMembership = team.memberships.find(
    (m) => m.userId === userId && m.role.toLowerCase() === "owner"
  );

  if (!ownerMembership) {
    return NextResponse.json(
      { error: "Only the team owner can edit this team." },
      { status: 403 }
    );
  }

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
      { error: "Team name and region are required." },
      { status: 400 }
    );
  }

  if (!VALID_REGIONS.includes(region)) {
    return NextResponse.json({ error: "Invalid region." }, { status: 400 });
  }

  try {
    assertCleanName("team name", name, { min: 3, max: 24 });
    assertCleanText("team bio", bio ?? undefined);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Invalid team fields." },
      { status: 400 }
    );
  }

  if (name.trim().toLowerCase() !== team.name.trim().toLowerCase()) {
    const existingByName = await prisma.team.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: "insensitive",
        },
        NOT: { id: team.id },
      },
    });

    if (existingByName) {
      return NextResponse.json(
        { error: "A team with that name already exists." },
        { status: 400 }
      );
    }
  }

  try {
    const updated = await prisma.team.update({
      where: { id: team.id },
      data: {
        name: name.trim(),
        region,
        isRecruiting: isRecruiting ?? team.isRecruiting,
        bio: bio ?? null,
        rankId: typeof rankId === "number" ? rankId : null,
        ...(logoUrl !== undefined ? { logoUrl } : {}),
      },
      include: {
        game: true,
        rank: true,
        memberships: {
          include: { user: true },
        },
      },
    });

    return NextResponse.json({ team: updated }, { status: 200 });
  } catch (err: any) {
    console.error("Update team error:", err);

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A team with that name already exists." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update team." },
      { status: 500 }
    );
  }
}