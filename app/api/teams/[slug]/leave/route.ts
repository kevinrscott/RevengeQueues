import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = parseInt((session.user as any).id as string, 10);
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json(
        { error: "Invalid user session." },
        { status: 400 }
      );
    }

    const { slug: rawSlug } = await params;
    const slug = decodeURIComponent(rawSlug ?? "");

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Invalid team slug." },
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
      return NextResponse.json(
        { error: "Team not found." },
        { status: 404 }
      );
    }

    const membership = team.memberships.find((m) => m.userId === userId);

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this team." },
        { status: 400 }
      );
    }

    if (membership.role.toLowerCase() === "owner") {
      return NextResponse.json(
        {
          error:
            "Owners cannot leave the team. You must transfer ownership or disband the team.",
        },
        { status: 400 }
      );
    }

    await prisma.teamMembership.delete({
      where: { id: membership.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Leave team error:", err);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}