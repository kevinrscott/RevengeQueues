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
  const { slug, isRecruiting } = body as {
    slug?: string;
    isRecruiting?: boolean;
  };

  if (!slug || typeof isRecruiting !== "boolean") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      memberships: true,
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const viewerMembership = team.memberships.find(
    (m) => m.userId === userId
  );

  const viewerRole = viewerMembership?.role?.toLowerCase() ?? null;

  if (!viewerRole || (viewerRole !== "owner" && viewerRole !== "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.team.update({
    where: { id: team.id },
    data: { isRecruiting },
  });

  return NextResponse.json({ ok: true, isRecruiting });
}