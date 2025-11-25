// app/teams/page.tsx
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
    <main className="flex min-h-screen justify-center bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-10 text-white">
      <div className="w-full max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-sm text-slate-300">
          You need a game profile before creating a team. Go to your profile
          and create a game profile first.
        </p>
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
    <main className="flex min-h-screen justify-center bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-10 text-white">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create a Team</h1>
          <p className="text-sm text-slate-300">
            You&apos;re not part of any team yet. Create one to get started.
          </p>
        </div>

        <CreateTeamForm ranks={ranks} />
      </div>
    </main>
  );
}

  return (
    <main className="flex min-h-screen justify-center bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-10 text-white">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Your Teams</h1>
            <p className="text-sm text-slate-300">
              Manage all the teams you&apos;re a part of. (Maximum of 3)
            </p>
          </div>

          {memberships.length < 3 ? (
            <Link
              href="/teams/create"
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition"
            >
              Create new team
            </Link>
          ) : (
            <button
              disabled
              className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed opacity-60"
              title="You have reached the maximum of 3 teams"
            >
              Create new team
            </button>
          )}
        </div>

        <div className="space-y-3">
          {memberships.map((m) => (
            <Link
                key={m.id}
                href={`/teams/${m.team.slug}`}
                className="block rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 hover:border-cyan-500 hover:bg-slate-900 transition"
            >
                <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="text-base font-semibold">
                    {m.team.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {m.team.region ?? "No region set"}
                      {m.team.rank && <> · {m.team.rank.name}</>}
                    </div>
                </div>
                <div className="text-xs text-cyan-400 uppercase tracking-wide">
                    {m.role || "Member"}
                </div>
                </div>
            </Link>
            ))}
        </div>
      </div>
    </main>
  );
}