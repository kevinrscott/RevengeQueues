import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/app/lib/prisma";
import Image from "next/image";
import LookingForTeamToggle from "../LookingForTeamToggle";
import InviteToTeamButton from "../InviteToTeamButton";

type PageProps = {
  params: Promise<{ username: string }>;
};

type TeamSummary = { id: number; name: string };

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;

  const session = await getServerSession(authOptions);

  let viewerId: number | null = null;
  if (session?.user && (session.user as any).id) {
    const idVal = (session.user as any).id;
    const parsed = parseInt(idVal as string, 10);
    if (!Number.isNaN(parsed)) {
      viewerId = parsed;
    }
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      profiles: {
        include: {
          game: true,
          rank: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const activeProfile = user.profiles[0] || null;
  const isOwnProfile = viewerId !== null && viewerId === user.id;

  const isProfilePrivateForViewer =
    !!activeProfile && activeProfile.isPrivate && !isOwnProfile;

  const memberships = await prisma.teamMembership.findMany({
    where: { userId: user.id },
    include: {
      team: {
        include: {
          game: true,
          rank: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const teamCount = memberships.length;
  const maxTeamsReached = teamCount >= 3;

  let inviteTeams: TeamSummary[] = [];
  if (!isOwnProfile && viewerId !== null && activeProfile && !activeProfile.isPrivate) {
    const teams = await prisma.team.findMany({
      where: {
        gameId: activeProfile.gameId,
        memberships: {
          some: {
            userId: viewerId,
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
      },
    });

    inviteTeams = teams;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto w-full px-4 pb-10 pt-8 md:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Player Profile</h1>
            <p className="text-sm text-slate-400">
              View game stats, team memberships, and recruiting status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isOwnProfile && activeProfile && (
              <LookingForTeamToggle
                profileId={activeProfile.id}
                initialLooking={activeProfile.lookingForTeam}
                maxTeamsReached={maxTeamsReached}
              />
            )}

            {isOwnProfile && (
              <Link
                href="/profile/edit"
                className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white"
              >
                Edit Profile
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/40 backdrop-blur space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-900">
                {user.profilePhoto ? (
                  <Image
                    src={user.profilePhoto}
                    alt={`${user.username} avatar`}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-300">
                    {user.username[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-100">{user.username}</h2>
                  {isOwnProfile && (
                    <span className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                      You
                    </span>
                  )}
                  {isProfilePrivateForViewer && (
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                      Private Profile
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  {user.region ?? "No region set"}
                </p>
                <p className="text-xs text-slate-500">
                  Joined{" "}
                  <span className="font-medium text-slate-300">
                    {user.createdAt.toLocaleDateString()}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {!isOwnProfile &&
                !isProfilePrivateForViewer &&
                viewerId !== null &&
                activeProfile &&
                !activeProfile.isPrivate &&
                inviteTeams.length > 0 && (
                  <InviteToTeamButton
                    targetUserId={user.id}
                    teams={inviteTeams}
                    lookingForTeam={activeProfile.lookingForTeam}
                  />
                )}

              {isOwnProfile && activeProfile?.isPrivate && (
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  Your profile is hidden from other players
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-5">
            {isProfilePrivateForViewer ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-5 text-sm text-slate-300">
                <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-xs font-semibold text-slate-200">
                  🔒
                </span>
                <p>
                  This player has set their game profile, stats, and team memberships to
                  private.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
                <div>
                  {activeProfile ? (
                    <>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-100">
                            {activeProfile.game.name} Profile
                          </h3>
                          <p className="text-xs text-slate-400">
                            Core stats for matchmaking and team scouting.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            In-game Name
                          </p>
                          <p className="mt-1 break-all text-base font-semibold text-slate-100">
                            {activeProfile.ingameName?.trim() || "Not set"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Rank
                          </p>
                          <p className="mt-1 text-base font-semibold text-slate-100">
                            {activeProfile.rank?.name || "Unranked"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Wins
                          </p>
                          <p className="mt-1 text-2xl font-bold text-emerald-300">
                            {activeProfile.wins}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Losses
                          </p>
                          <p className="mt-1 text-2xl font-bold text-rose-300">
                            {activeProfile.losses}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-300">
                      {isOwnProfile
                        ? "You don't have a game profile set up yet. Create one from the dashboard to start looking for teams."
                        : "This user doesn't have a game profile yet."}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 h-full flex flex-col">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">Teams</h3>
                      <p className="text-xs text-slate-400">
                        Current rosters and roles for this player.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-300">
                      {teamCount} team{teamCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  {memberships.length === 0 ? (
                    <p className="text-sm text-slate-300">
                      {isOwnProfile
                        ? "You are not in any teams yet. Join or create a team to show up here."
                        : "This player is not currently on any teams."}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-64">
                      {memberships.map((m) => (
                        <Link
                          key={m.id}
                          href={`/teams/${m.team.slug}`}
                          className="group flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm transition hover:border-slate-600 hover:bg-slate-900/80"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-100">
                              {m.team.name[0]?.toUpperCase() ?? "T"}
                            </div>
                            <div>
                              <div className="font-medium text-slate-100">
                                {m.team.name}
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-400">
                                {m.team.game?.name} • {m.role}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 text-[11px] text-slate-400">
                            {m.team.rank?.name && (
                              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium">
                                {m.team.rank.name}
                              </span>
                            )}
                            {m.team.isRecruiting && (
                              <span className="rounded-full border border-emerald-500/60 bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                Recruiting
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
