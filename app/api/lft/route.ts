import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt((session.user as any).id as string, 10);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { profileId, lookingForTeam } = body as {
    profileId?: number;
    lookingForTeam?: boolean;
  };

  if (typeof profileId !== "number" || typeof lookingForTeam !== "boolean") {
    return NextResponse.json(
      { error: "profileId (number) and lookingForTeam (boolean) are required" },
      { status: 400 }
    );
  }

  const profile = await prisma.userGameProfile.findFirst({
    where: { id: profileId, userId },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (lookingForTeam) {
    const membershipCount = await prisma.teamMembership.count({
      where: { userId },
    });

    if (membershipCount >= 3) {
      return NextResponse.json(
        {
          error:
            "You are already in the maximum number of teams (3). Leave a team before enabling Looking for Team.",
        },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.userGameProfile.update({
    where: { id: profileId },
    data: { lookingForTeam },
  });

  return NextResponse.json(updated);
}