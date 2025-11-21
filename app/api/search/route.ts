import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({
      players: [],
      teams: [],
    });
  }

  const [players, teams] = await Promise.all([
    prisma.user.findMany({
      where: {
        username: {
          contains: q,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        username: true,
        region: true,
        profilePhoto: true,
      },
      take: 5,
      orderBy: { username: "asc" },
    }),
    prisma.team.findMany({
      where: {
        name: {
          contains: q,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        region: true,
        logoUrl: true,
      },
      take: 5,
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ players, teams });
}