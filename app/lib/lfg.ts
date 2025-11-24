import { prisma } from "@/app/lib/prisma";

export async function getLookingForTeamProfiles(options: {
  gameId?: number;
  rankId?: number;
}) {
  const { gameId, rankId } = options;

  return prisma.userGameProfile.findMany({
    where: {
      lookingForTeam: true,
      ...(gameId ? { gameId } : {}),
      ...(rankId ? { rankId } : {}),
    },
    include: {
      user: true,
      game: true,
      rank: true,
    },
    orderBy: {
      wins: "desc",
    },
  });
}

export async function getLookingForPlayersTeams(options: {
  gameId?: number;
  rankId?: number;
}) {
  const { gameId, rankId } = options;

  return prisma.team.findMany({
    where: {
      isRecruiting: true,
      ...(gameId ? { gameId } : {}),
      ...(rankId ? { rankId } : {}),
    },
    include: {
      game: true,
      rank: true,
      memberships: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
