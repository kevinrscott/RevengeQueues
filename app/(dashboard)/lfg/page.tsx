import { prisma } from "@/app/lib/prisma";
import LfgClient from "./LfgClient";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { redirect } from "next/navigation";

export default async function LfgPage() {
  console.time("LFG_PAGE_TOTAL");

  console.time("getSession");
  const session = await getServerSession(authOptions);
  console.timeEnd("getSession");

  if (!session?.user || !(session.user as any).id) {
    console.timeEnd("LFG_PAGE_TOTAL");
    redirect("/login");
  }

  const userId = parseInt((session.user as any).id as string, 10);
  if (Number.isNaN(userId)) {
    console.timeEnd("LFG_PAGE_TOTAL");
    redirect("/login");
  }

  console.time("fetchUser");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      region: true,
      profiles: {
        select: {
          id: true,
          ingameName: true,
          wins: true,
          losses: true,
          lookingForTeam: true,
          game: {
            select: {
              id: true,
              name: true,
              shortCode: true,
            },
          },
          rank: {
            select: {
              id: true,
              name: true,
              order: true,
              gameId: true,
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  console.timeEnd("fetchUser");

  if (!user || user.profiles.length === 0) {
    console.timeEnd("LFG_PAGE_TOTAL");
    redirect("/profile");
  }

  const activeProfile = user.profiles[0];
  const currentGame = activeProfile.game;

  console.time("allQueries");
  const [
    viewerTeamsCount,
    ranks,
    lftProfiles,
    lfpTeams,
    manageableTeams,
  ] = await Promise.all([
    prisma.teamMembership.count({
      where: { userId },
    }),

    prisma.gameRank.findMany({
      where: { gameId: currentGame.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        order: true,
        gameId: true,
      },
    }),

    prisma.userGameProfile.findMany({
      where: {
        gameId: currentGame.id,
        lookingForTeam: true,
      },
      select: {
        id: true,
        ingameName: true,
        wins: true,
        losses: true,
        lookingForTeam: true,
        game: {
          select: {
            id: true,
            name: true,
            shortCode: true,
          },
        },
        rank: {
          select: {
            id: true,
            name: true,
            order: true,
            gameId: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            region: true,
          },
        },
      },
    }),

    prisma.team.findMany({
      where: {
        gameId: currentGame.id,
        isRecruiting: true,
      },
      select: {
        id: true,
        name: true,
        isRecruiting: true,
        logoUrl: true,
        game: {
          select: {
            id: true,
            name: true,
            shortCode: true,
          },
        },
        rank: {
          select: {
            id: true,
            name: true,
            order: true,
            gameId: true,
          },
        },
        memberships: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    }),

    prisma.team.findMany({
      where: {
        gameId: currentGame.id,
        memberships: {
          some: {
            userId,
            role: {
              in: ["owner", "manager"],
              mode: "insensitive",
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        isRecruiting: true,
        logoUrl: true,
        game: {
          select: {
            id: true,
            name: true,
            shortCode: true,
          },
        },
        rank: {
          select: {
            id: true,
            name: true,
            order: true,
            gameId: true,
          },
        },
        memberships: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    }),
  ]);
  console.timeEnd("allQueries");

  console.timeEnd("LFG_PAGE_TOTAL");

  
  return (
    <main className="min-h-screen bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6">
      <div className="mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Find Teams &amp; Players</h1>
        <LfgClient
          currentGame={currentGame}
          ranks={ranks}
          initialLftProfiles={lftProfiles}
          initialLfpTeams={lfpTeams}
          manageableTeams={manageableTeams}
          viewerId={userId}
          viewerProfile={{
            id: activeProfile.id,
            ingameName: activeProfile.ingameName,
            wins: activeProfile.wins,
            losses: activeProfile.losses,
            lookingForTeam: activeProfile.lookingForTeam,
            game: currentGame,
            rank: activeProfile.rank,
            user: {
              id: user.id,
              username: user.username,
              region: user.region,
            },
          }}
          viewerTeamsCount={viewerTeamsCount}
        />
      </div>
    </main>
  );
}