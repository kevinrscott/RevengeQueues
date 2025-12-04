import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import ScrimsClient from "./ScrimsClient";

export const preferredRegion = ["pdx1"];

export default async function ScrimsPage() {
  console.time("ScrimsPage total");

  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as any).id) {
    redirect("/login");
  }

  const viewerId = parseInt((session.user as any).id as string, 10);
  if (Number.isNaN(viewerId)) {
    redirect("/login");
  }

  console.time("viewerProfile");
  const viewerProfile = await prisma.userGameProfile.findFirst({
    where: { userId: viewerId },
    include: {
      game: true,
      rank: true,
      user: true,
    },
  });
  console.timeEnd("viewerProfile");

  if (!viewerProfile) {
    redirect("/profile");
  }

  const currentGame = viewerProfile.game;

  // Run the rest in parallel: count, viewerTeams, scrims
  console.time("parallel DB queries");
  const [viewerTeamsCount, viewerTeams, scrims] = await Promise.all([
    (async () => {
      console.time("viewerTeamsCount");
      const result = await prisma.teamMembership.count({
        where: { userId: viewerId },
      });
      console.timeEnd("viewerTeamsCount");
      return result;
    })(),
    (async () => {
      console.time("viewerTeams");
      const result = await prisma.team.findMany({
        where: {
          gameId: currentGame.id,
          memberships: {
            some: { userId: viewerId },
          },
        },
        include: {
          rank: true,
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });
      console.timeEnd("viewerTeams");
      return result;
    })(),
    (async () => {
      console.time("scrims");
      const result = await prisma.scrim.findMany({
        where: {
          hostTeam: {
            gameId: currentGame.id,
          },
        },
        include: {
          hostTeam: {
            include: {
              rank: true,
              memberships: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
            },
          },
          requests: {
            where: { status: "accepted" },
            include: {
              team: {
                include: {
                  rank: true,
                  memberships: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          username: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        // limit the number of scrims returned for performance
        take: 20,
      });
      console.timeEnd("scrims");
      return result;
    })(),
  ]);
  console.timeEnd("parallel DB queries");

  console.timeEnd("ScrimsPage total");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto w-full px-4 pb-10 pt-8 md:px-6 lg:px-8 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold text-slate-100">
            Scrims &amp; Practice Matches
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Host scrims and join practice matches in {currentGame.name}. Team
            owners and managers can create scrims and request to join others.
          </p>
        </div>

        <ScrimsClient
          currentGame={{
            id: currentGame.id,
            name: currentGame.name,
            shortCode: currentGame.shortCode,
          }}
          viewerId={viewerId}
          viewerTeams={viewerTeams.map((t) => ({
            id: t.id,
            name: t.name,
            isRecruiting: t.isRecruiting,
            logoUrl: t.logoUrl,
            game: {
              id: currentGame.id,
              name: currentGame.name,
              shortCode: currentGame.shortCode,
            },
            rank: t.rank
              ? {
                  id: t.rank.id,
                  name: t.rank.name,
                  order: t.rank.order,
                  gameId: t.rank.gameId,
                }
              : null,
            memberships: t.memberships.map((m) => ({
              userId: m.userId,
              role: m.role,
              user: {
                id: m.user.id,
                username: m.user.username,
              },
            })),
          }))}
          initialScrims={scrims.map((s) => {
            const isHosted = s.hostTeam.memberships.some(
              (m) => m.userId === viewerId
            );

            const acceptedRequest = s.requests[0] ?? null;

            const matchedTeam = acceptedRequest
              ? {
                  id: acceptedRequest.team.id,
                  name: acceptedRequest.team.name,
                  isRecruiting: acceptedRequest.team.isRecruiting,
                  logoUrl: acceptedRequest.team.logoUrl,
                  game: {
                    id: currentGame.id,
                    name: currentGame.name,
                    shortCode: currentGame.shortCode,
                  },
                  rank: acceptedRequest.team.rank
                    ? {
                        id: acceptedRequest.team.rank.id,
                        name: acceptedRequest.team.rank.name,
                        order: acceptedRequest.team.rank.order,
                        gameId: acceptedRequest.team.rank.gameId,
                      }
                    : null,
                  memberships: acceptedRequest.team.memberships.map((m) => ({
                    userId: m.userId,
                    role: m.role,
                    user: {
                      id: m.user.id,
                      username: m.user.username,
                    },
                  })),
                }
              : null;

            const viewerTeamIds = viewerTeams.map((t) => t.id);
            const isJoined =
              !!acceptedRequest && viewerTeamIds.includes(acceptedRequest.teamId);

            return {
              id: s.id,
              bestOf: s.bestOf,
              gamemode: s.gamemode,
              map: s.map,
              scrimCode:
                s.scrimCode !== null && s.scrimCode !== undefined
                  ? String(s.scrimCode)
                  : null,
              scheduledAt: s.scheduledAt ? s.scheduledAt.toISOString() : null,
              status: s.status,
              hostTeam: {
                id: s.hostTeam.id,
                name: s.hostTeam.name,
                isRecruiting: s.hostTeam.isRecruiting,
                logoUrl: s.hostTeam.logoUrl,
                game: {
                  id: currentGame.id,
                  name: currentGame.name,
                  shortCode: currentGame.shortCode,
                },
                rank: s.hostTeam.rank
                  ? {
                      id: s.hostTeam.rank.id,
                      name: s.hostTeam.rank.name,
                      order: s.hostTeam.rank.order,
                      gameId: s.hostTeam.rank.gameId,
                    }
                  : null,
                memberships: s.hostTeam.memberships.map((m) => ({
                  userId: m.userId,
                  role: m.role,
                  user: {
                    id: m.user.id,
                    username: m.user.username,
                  },
                })),
              },
              isHosted,
              isJoined,
              hostParticipantIds: s.hostParticipantIds ?? [],
              matchedTeam,
              matchedParticipantIds: acceptedRequest?.participantIds ?? [],
            };
          })}
          viewerTeamsCount={viewerTeamsCount}
        />
      </div>
    </main>
  );
}