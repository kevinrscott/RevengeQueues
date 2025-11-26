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

  const teamCount = await prisma.teamMembership.count({
    where: { userId: user.id },
  });
  const maxTeamsReached = teamCount >= 3;

  let inviteTeams: TeamSummary[] = [];
  if (!isOwnProfile && viewerId !== null && activeProfile) {
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
    <main className="min-h-screen bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
      <div className="w-full max-w-xl max-h-[80vh] border-1 border-slate-800 overflow-y-auto rounded-xl bg-slate-900 p-8 shadow-2xl backdrop-blur space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-slate-800 overflow-hidden">
              {user.profilePhoto ? (
                <Image
                  src={user.profilePhoto}
                  alt={`${user.username} avatar`}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold">
                  {user.username[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-300">
                {user.username}
              </h1>
              <span className="text-sm text-slate-400">
                {user.region ?? "No region set"}
              </span>
              <span className="block text-sm text-slate-500">
                Joined {user.createdAt.toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition"
              >
                Edit Profile
              </Link>
            )}

            {!isOwnProfile &&
              viewerId !== null &&
              activeProfile &&
              inviteTeams.length > 0 && (
                <InviteToTeamButton
                  targetUserId={user.id}
                  teams={inviteTeams}
                  lookingForTeam={activeProfile.lookingForTeam}
                />
              )}
          </div>
        </div>

        {activeProfile ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                {activeProfile.game.name} Profile
              </h2>
            </div>

            <div className="flex justify-between text-base gap-6">
              <div>
                <p className="text-slate-400">In-game Name</p>
                <p className="font-semibold text-lg">
                  {activeProfile.ingameName?.trim() || "Not Set"}
                </p>
              </div>

              <div>
                <p className="text-slate-400">Rank</p>
                <p className="font-semibold text-lg">
                  {activeProfile.rank?.name || "Unranked"}
                </p>
              </div>

              <div>
                <p className="text-slate-400">Wins</p>
                <p className="font-semibold text-lg">{activeProfile.wins}</p>
              </div>

              <div>
                <p className="text-slate-400">Losses</p>
                <p className="font-semibold text-lg">{activeProfile.losses}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-5 text-sm text-slate-300">
            {isOwnProfile
              ? "You don't have a game profile yet. Once you create one, it will show up here."
              : "This user doesn't have a game profile yet."}
          </div>
        )}
      </div>
    </main>
  );
}