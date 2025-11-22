import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";
import { del } from "@vercel/blob";
import { assertCleanName, assertCleanText } from "@/app/lib/moderation"; // 👈 NEW

const VALID_REGIONS = ["NA", "EU", "SA", "AS", "OC"] as const;

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt((session.user as any).id as string, 10);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const body = await req.json();
  const { region, profilePhoto, ingameName, rank } = body as {
    region?: string | null;
    profilePhoto?: string;
    ingameName?: string;
    rank?: string;
  };

  // 🔒 Language + shape checks BEFORE DB work
  try {
    if (ingameName) {
      // 2–16 chars, safe chars, no obscenity
      assertCleanName("In-game Name", ingameName, { min: 2, max: 16 });
    }

    if (rank) {
      // Free text but must not be obscene
      assertCleanText("Rank", rank);
    }
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Invalid profile data." },
      { status: 400 }
    );
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhoto: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const oldPhotoUrl = existingUser.profilePhoto ?? null;
    const newPhotoUrl = profilePhoto ?? oldPhotoUrl;

    const userUpdateData: {
      region?: string | null;
      profilePhoto: string | null;
    } = {
      profilePhoto: newPhotoUrl,
    };

    if (typeof region !== "undefined") {
      const normalizedRegion =
        region && VALID_REGIONS.includes(region as (typeof VALID_REGIONS)[number])
          ? region
          : null;
      userUpdateData.region = normalizedRegion;
    }

    await prisma.user.update({
      where: { id: userId },
      data: userUpdateData,
    });

    const existingProfile = await prisma.userGameProfile.findFirst({
      where: { userId },
      orderBy: { id: "asc" },
    });

    if (existingProfile) {
      await prisma.userGameProfile.update({
        where: { id: existingProfile.id },
        data: {
          ingameName,
          rank,
        },
      });
    }

    if (
      oldPhotoUrl &&
      newPhotoUrl &&
      oldPhotoUrl !== newPhotoUrl &&
      oldPhotoUrl.includes(".blob.vercel-storage.com/")
    ) {
      try {
        await del(oldPhotoUrl);
      } catch (err) {
        console.error("Failed to delete old avatar from Blob", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
