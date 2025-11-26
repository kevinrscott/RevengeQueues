import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
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

    const { slug: rawSlug, memberId: rawMemberId } = await params;
    const slug = decodeURIComponent(rawSlug ?? "");
    const memberId = parseInt(rawMemberId, 10);

    if (!slug || !memberId || Number.isNaN(memberId)) {
      return NextResponse.json(
        { error: "Invalid team or member." },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { slug },
      include: { memberships: true },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found." },
        { status: 404 }
      );
    }

    const viewerMembership = team.memberships.find(
      (m) => m.userId === userId
    );
    if (!viewerMembership) {
      return NextResponse.json(
        { error: "You are not a member of this team." },
        { status: 403 }
      );
    }

    const viewerRole = viewerMembership.role.toLowerCase();
    if (viewerRole !== "owner" && viewerRole !== "manager") {
      return NextResponse.json(
        { error: "You do not have permission to manage members." },
        { status: 403 }
      );
    }

    const targetMembership = team.memberships.find(
      (m) => m.id === memberId
    );
    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found on this team." },
        { status: 404 }
      );
    }

    const targetRole = targetMembership.role.toLowerCase();

    if (viewerRole === "manager" && targetRole === "owner") {
      return NextResponse.json(
        { error: "Managers cannot remove the owner." },
        { status: 403 }
      );
    }

    if (targetMembership.userId === userId) {
      return NextResponse.json(
        { error: "Use the leave team action to remove yourself." },
        { status: 400 }
      );
    }

    await prisma.teamMembership.delete({
      where: { id: targetMembership.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Kick member error:", err);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}