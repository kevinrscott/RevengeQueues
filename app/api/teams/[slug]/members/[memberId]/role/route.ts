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

    const body = await req.json().catch(() => ({}));
    let { role } = body as { role?: string };

    if (!role || typeof role !== "string") {
      return NextResponse.json(
        { error: "Role is required." },
        { status: 400 }
      );
    }

    role = role.toLowerCase();
    if (role !== "manager" && role !== "member") {
      return NextResponse.json(
        { error: "Role must be 'Manager' or 'Member'." },
        { status: 400 }
      );
    }

    const normalizedRole = role === "manager" ? "Manager" : "Member";

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
        { error: "Managers cannot change the owner." },
        { status: 403 }
      );
    }

    if (
      targetMembership.id === viewerMembership.id &&
      normalizedRole.toLowerCase() === "owner"
    ) {
      return NextResponse.json(
        { error: "You cannot change your own role to owner via this action." },
        { status: 403 }
      );
    }

    await prisma.teamMembership.update({
      where: { id: targetMembership.id },
      data: { role: normalizedRole },
    });

    return NextResponse.json({ success: true, role: normalizedRole });
  } catch (err) {
    console.error("Update member role error:", err);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}