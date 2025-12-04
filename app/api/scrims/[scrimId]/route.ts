import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ scrimId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewerId = parseInt((session.user as any).id as string, 10);
    if (Number.isNaN(viewerId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { scrimId: scrimIdParam } = await context.params;
    const scrimId = Number(scrimIdParam);
    if (!scrimId || Number.isNaN(scrimId)) {
      return NextResponse.json({ error: "Invalid scrim id" }, { status: 400 });
    }

    let body: { scrimCode?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { scrimCode } = body;
    if (!scrimCode || !scrimCode.trim()) {
      return NextResponse.json(
        { error: "Scrim code is required." },
        { status: 400 }
      );
    }

    const normalizedCode = scrimCode.trim().toUpperCase();

    const scrim = await prisma.scrim.findUnique({
      where: { id: scrimId },
      include: {
        hostTeam: {
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!scrim) {
      return NextResponse.json({ error: "Scrim not found." }, { status: 404 });
    }

    const viewerMembership = scrim.hostTeam.memberships.find(
      (m) =>
        m.userId === viewerId &&
        ["owner", "manager"].includes(m.role.toLowerCase())
    );

    if (!viewerMembership) {
      return NextResponse.json(
        { error: "You do not have permission to manage this scrim." },
        { status: 403 }
      );
    }

    try {
      const updated = await prisma.scrim.update({
        where: { id: scrimId },
        data: {
          scrimCode: normalizedCode,
        },
        select: {
          id: true,
          scrimCode: true,
        },
      });

      return NextResponse.json({
        id: updated.id,
        scrimCode: updated.scrimCode,
      });
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "That scrim code is already in use." },
          { status: 409 }
        );
      }

      console.error("Error updating scrim:", err);
      return NextResponse.json(
        { error: "Internal server error." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Error in PATCH /api/scrims/[scrimId]:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ scrimId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewerId = parseInt((session.user as any).id as string, 10);
    if (Number.isNaN(viewerId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { scrimId: scrimIdParam } = await context.params;
    const scrimId = Number(scrimIdParam);
    if (!scrimId || Number.isNaN(scrimId)) {
      return NextResponse.json({ error: "Invalid scrim id" }, { status: 400 });
    }

    const scrim = await prisma.scrim.findUnique({
      where: { id: scrimId },
      include: {
        hostTeam: {
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!scrim) {
      return NextResponse.json({ error: "Scrim not found." }, { status: 404 });
    }

    const viewerMembership = scrim.hostTeam.memberships.find(
      (m) =>
        m.userId === viewerId &&
        ["owner", "manager"].includes(m.role.toLowerCase())
    );

    if (!viewerMembership) {
      return NextResponse.json(
        { error: "You do not have permission to disband this scrim." },
        { status: 403 }
      );
    }

    // Delete related ScrimRequest rows first, then the scrim itself
    await prisma.$transaction([
      prisma.scrimRequest.deleteMany({
        where: { scrimId },
      }),
      prisma.scrim.delete({
        where: { id: scrimId },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      console.error("FK error when deleting scrim:", err.meta);
      return NextResponse.json(
        {
          error:
            "Cannot disband scrim because related records still exist. Try removing related scrim data first.",
        },
        { status: 409 }
      );
    }

    console.error("Error in DELETE /api/scrims/[scrimId]:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}