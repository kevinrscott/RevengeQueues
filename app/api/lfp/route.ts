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
  const { teamId, isRecruiting, rankId } = body as {
    teamId: number;
    isRecruiting: boolean;
    rankId?: number | null;
  };

  const membership = await prisma.teamMembership.findFirst({
    where: { teamId, userId },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a team member" }, { status: 403 });
  }

  const allowedRoles = ["owner", "manager"];
  if (!allowedRoles.includes(membership.role.toLowerCase())) {
    return NextResponse.json(
      { error: "Only team owner/manager can change recruiting" },
      { status: 403 }
    );
  }

  const data: any = { isRecruiting };

  if (typeof rankId !== "undefined") {
    data.rankId = rankId;
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data,
  });

  return NextResponse.json(updated);
}