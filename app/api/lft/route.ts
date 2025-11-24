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

  const body = await req.json();
  const { profileId, lookingForTeam } = body as {
    profileId: number;
    lookingForTeam: boolean;
  };

  const profile = await prisma.userGameProfile.findFirst({
    where: { id: profileId, userId },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const updated = await prisma.userGameProfile.update({
    where: { id: profileId },
    data: { lookingForTeam },
  });

  return NextResponse.json(updated);
}