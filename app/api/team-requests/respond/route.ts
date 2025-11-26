import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewerId = parseInt((session.user as any).id as string, 10);
  if (Number.isNaN(viewerId)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { notificationId, action } = body as {
    notificationId?: number;
    action?: "accept" | "reject" | string;
  };

  // IMPORTANT: use == null, not !notificationId
  if (
    notificationId == null ||
    typeof notificationId !== "number" ||
    (action !== "accept" && action !== "reject")
  ) {
    return NextResponse.json(
      { error: "notificationId (number) and action ('accept'|'reject') are required" },
      { status: 400 }
    );
  }

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, recipientId: viewerId },
    include: {
      teamRequest: {
        include: {
          team: {
            include: { memberships: true },
          },
          user: true,       // the user being invited / requesting
          createdBy: true,  // who created the request
        },
      },
    },
  });

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  const tr = notification.teamRequest;

  // If this notification isn't tied to a TeamRequest, just mark it read
  if (!tr) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  // Only let the right people act
  const isInvite = tr.kind === "invite";
  const isJoinRequest = tr.kind === "join_request";

  if (isInvite) {
    // The invited player is tr.userId
    if (tr.userId !== viewerId) {
      return NextResponse.json(
        { error: "You are not allowed to act on this invite" },
        { status: 403 }
      );
    }
  } else if (isJoinRequest) {
    // Must be owner/manager of the team
    const isManager = tr.team.memberships.some(
      (m) =>
        m.userId === viewerId &&
        ["owner", "manager"].includes(m.role.toLowerCase())
    );

    if (!isManager) {
      return NextResponse.json(
        { error: "You are not allowed to act on this request" },
        { status: 403 }
      );
    }
  }

  if (tr.status !== "pending") {
    return NextResponse.json(
      { error: "This request has already been handled" },
      { status: 400 }
    );
  }

  const now = new Date();

  if (action === "accept") {
    const newMemberUserId = tr.userId;

    const membershipCount = await prisma.teamMembership.count({
      where: { userId: newMemberUserId },
    });

    if (membershipCount >= 3) {
      return NextResponse.json(
        { error: "This player is already in the maximum of 3 teams." },
        { status: 400 }
      );
    }

    await prisma.teamMembership.upsert({
      where: {
        user_team_unique: {
          userId: newMemberUserId,
          teamId: tr.teamId,
        },
      },
      create: {
        userId: newMemberUserId,
        teamId: tr.teamId,
        role: "member",
      },
      update: {},
    });

    const newCount = membershipCount + 1;
    if (newCount >= 3) {
      await prisma.userGameProfile.updateMany({
        where: {
          userId: newMemberUserId,
          lookingForTeam: true,
        },
        data: {
          lookingForTeam: false,
        },
      });
    }

    await prisma.teamRequest.update({
      where: { id: tr.id },
      data: {
        status: "accepted",
        respondedAt: now,
      },
    });

    await prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: now },
    });

    return NextResponse.json({ success: true });
  } else {
    await prisma.teamRequest.update({
      where: { id: tr.id },
      data: {
        status: "rejected",
        respondedAt: now,
      },
    });

    await prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: now },
    });

    return NextResponse.json({ success: true });
  }
}