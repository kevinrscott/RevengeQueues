import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/app/lib/prisma";

type PageProps = {
  params: Promise<{ username: string }>;
};

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
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const activeProfile = user.profiles[0] || null;
  const isOwnProfile = viewerId !== null && viewerId === user.id;

  return (
    <main className="min-h-screen bg-gradient-to-r from-slate-900 to-cyan-900 p-6 text-white">
      <div className="w-full max-w-xl max-h-[80vh] border-1 border-black overflow-y-auto rounded-xl bg-stone-900 p-8 shadow-2xl backdrop-blur space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-slate-800 overflow-hidden">
              {user.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={`${user.username} avatar`}
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
            </div>
          </div>

          {isOwnProfile && (
            <Link
              href="/profile/edit"
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-400 transition"
            >
              Edit Profile
            </Link>
          )}
        </div>

        {activeProfile ? (
          <div className="rounded-lg border border-slate-900 bg-stone-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {activeProfile.game.name} Profile
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">In-game Name</p>
                <p className="font-medium">
                  {activeProfile.ingameName ?? "Not Set"}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Rank</p>
                <p className="font-medium">
                  {activeProfile.rank ?? "Unranked"}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Wins</p>
                <p className="font-medium">{activeProfile.wins}</p>
              </div>
              <div>
                <p className="text-slate-400">Losses</p>
                <p className="font-medium">{activeProfile.losses}</p>
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