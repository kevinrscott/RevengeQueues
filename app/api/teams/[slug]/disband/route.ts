import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";
import { del } from "@vercel/blob";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(req: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
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

  const isOwner = team.memberships.some(
    (m) => m.userId === userId && m.role.toLowerCase() === "owner"
  );

  if (!isOwner) {
    return NextResponse.json(
      { error: "Only the team owner can disband this team" },
      { status: 403 }
    );
  }

  if (team.logoUrl) {
    try {
      await del(team.logoUrl);
    } catch (err) {
      console.error("Failed to delete team logo blob:", err);
    }
  }

  await prisma.teamMembership.deleteMany({
    where: { teamId: team.id },
  });

  await prisma.team.delete({
    where: { id: team.id },
  });

  return NextResponse.json({ ok: true });
}