import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = dbUser.id;

  const { gameId } = await req.json();

  if (!gameId) {
    return NextResponse.json({ error: "gameId is required" }, { status: 400 });
  }

  const game = await prisma.game.findUnique({
    where: { id: Number(gameId) },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const profile = await prisma.userGameProfile.upsert({
    where: {
      user_game_unique: {
        userId,
        gameId: Number(gameId),
      },
    },
    update: {},
    create: {
      userId,
      gameId: Number(gameId),
      ingameName: "",
      rank: null,
      wins: 0,
      losses: 0,
    },
    include: { game: true },
  });

  return NextResponse.json({ profile });
}
