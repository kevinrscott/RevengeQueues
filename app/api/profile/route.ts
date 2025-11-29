import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { prisma } from "@/app/lib/prisma";
import { del } from "@vercel/blob";
import { assertCleanName } from "@/app/lib/moderation";
import { Prisma } from "@prisma/client";

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
  const { region, profilePhoto, ingameName, rankId, profileId, isPrivate } = body as {
    region?: string | null;
    profilePhoto?: string;
    ingameName?: string;
    rankId?: number | null;
    profileId?: number | null;
    isPrivate?: boolean;
  };

  try {
    if (ingameName) {
      assertCleanName("In-game Name", ingameName, { min: 2, max: 16 });
    }
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Invalid profile data." },
      { status: 400 },
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

    const userUpdateData: Prisma.UserUpdateInput = {
      profilePhoto: newPhotoUrl,
    };

    if (typeof region !== "undefined") {
      const normalizedRegion =
        region &&
        VALID_REGIONS.includes(region as (typeof VALID_REGIONS)[number])
          ? region
          : null;

      userUpdateData.region =
        normalizedRegion as Prisma.UserUpdateInput["region"];
    }

    await prisma.user.update({
      where: { id: userId },
      data: userUpdateData,
    });

    let profile = null;

    if (profileId) {
      profile = await prisma.userGameProfile.findUnique({
        where: { id: profileId },
      });
      if (!profile || profile.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      profile = await prisma.userGameProfile.findFirst({
        where: { userId },
        orderBy: { id: "asc" },
      });
    }

    if (profile) {
      let safeRankId: number | null | undefined = rankId;
      if (typeof rankId === "number") {
        const rank = await prisma.gameRank.findUnique({
          where: { id: rankId },
        });
        if (!rank || rank.gameId !== profile.gameId) {
          return NextResponse.json(
            { error: "Rank does not belong to this game" },
            { status: 400 },
          );
        }
        safeRankId = rankId;
      } else if (rankId === null) {
        safeRankId = null;
      } else {
        safeRankId = undefined;
      }

      const profileUpdateData: Prisma.UserGameProfileUpdateInput = {};

      if (typeof ingameName !== "undefined") {
        profileUpdateData.ingameName = ingameName;
      }

      if (typeof isPrivate === "boolean") {
        profileUpdateData.isPrivate = isPrivate;
      }

      if (typeof safeRankId !== "undefined") {
        if (safeRankId === null) {
          profileUpdateData.rank = { disconnect: true };
        } else {
          profileUpdateData.rank = { connect: { id: safeRankId } };
        }
      }

      if (Object.keys(profileUpdateData).length > 0) {
        await prisma.userGameProfile.update({
          where: { id: profile.id },
          data: profileUpdateData,
        });
      }
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
      { status: 500 },
    );
  }
}