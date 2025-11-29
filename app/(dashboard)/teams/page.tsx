import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import Link from "next/link";
import CreateTeamForm from "./create/CreateTeamForm";

export default async function TeamsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any)?.id) {
    redirect("/login");
  }

  const userId = parseInt((session.user as any).id as string, 10);

  const memberships = await prisma.teamMembership.findMany({
    where: { userId },
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

  const profile = await prisma.userGameProfile.findFirst({
    where: { userId },
    orderBy: { id: "asc" },
  });

  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto w-full px-4 pb-10 pt-8 md:px-6 lg:px-8">
          <div className="mb-6 border-b border-slate-800 pb-4">
            <h1 className="text-2xl font-semibold text-slate-100">Teams</h1>
            <p className="mt-1 text-sm text-slate-400">
              You&apos;ll need a game profile before you can create or join a team.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/40 backdrop-blur">
            <p className="text-sm text-slate-300">
              You don&apos;t have a game profile yet. Head over to your{" "}
              <Link href="/profile" className="font-semibold text-cyan-400 hover:text-cyan-300">
                profile
              </Link>{" "}
              and create a game profile to start making or joining teams.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const ranks = await prisma.gameRank.findMany({
    where: { gameId: profile.gameId },
    orderBy: { order: "asc" },
  });

  if (memberships.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto w-full max-w-4xl px-4 pb-10 pt-8 md:px-6 lg:px-8">
          <div className="mb-6 border-b border-slate-800 pb-4">
            <h1 className="text-2xl font-semibold text-slate-100">Create a Team</h1>
            <p className="mt-1 text-sm text-slate-400">
              You&apos;re not part of any team yet. Create one to get started.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/40 backdrop-blur">
            <CreateTeamForm ranks={ranks} />
          </div>
        </div>
      </main>
    );
  }

  const maxTeamsReached = memberships.length >= 3;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-8 md:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Your Teams</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage all the teams you&apos;re part of. Maximum of 3 active teams.
            </p>
          </div>

          <div>
            {!maxTeamsReached ? (
              <Link
                href="/teams/create"
                className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white"
              >
                Create new team
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-semibold text-slate-400 opacity-60 cursor-not-allowed"
                title="You have reached the maximum of 3 teams"
              >
                Create new team
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/40 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Teams you&apos;re in
            </h2>
            <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-300">
              {memberships.length} team{memberships.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {memberships.map((m) => (
              <Link
                key={m.id}
                href={`/teams/${m.team.slug}`}
                className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm transition hover:border-slate-600 hover:bg-slate-900/80"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-100">
                    {m.team.name[0]?.toUpperCase() ?? "T"}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">
                      {m.team.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {m.team.game?.name && <>{m.team.game.name} · </>}
                      {m.team.region ?? "No region set"}
                      {m.team.rank && <> · {m.team.rank.name}</>}
                    </div>
                  </div>
                </div>

                <div className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                  {m.role || "Member"}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}