export const preferredRegion = ["pdx1"];

import { prisma } from "@/app/lib/prisma";
import LfgClient from "./LfgClient";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { redirect } from "next/navigation";

export default async function LfgPage() {

  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    redirect("/login");
  }

  const userId = parseInt((session.user as any).id as string, 10);
  if (Number.isNaN(userId)) {
    redirect("/login");
  }

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


  if (!user || user.profiles.length === 0) {
    redirect("/profile");
  }

  const activeProfile = user.profiles[0];
  const currentGame = activeProfile.game;

  const viewerTeamsCount = await prisma.teamMembership.count({
    where: { userId },
  });


  const [ranks, lftProfiles, lfpTeams, manageableTeams] = await Promise.all([
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

  
  return (
  <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-8 md:px-6 lg:px-8 space-y-6">
      {/* Page header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-semibold text-slate-100">
          Find Teams &amp; Players
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Match with players and teams in {currentGame.name}. Filter by rank and
          use requests &amp; invites to build your roster.
        </p>
      </div>

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