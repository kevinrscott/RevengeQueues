import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import CreateTeamForm from "./CreateTeamForm";

export default async function CreateTeamPage() {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any)?.id) {
    redirect("/login");
  }

  const userId = parseInt((session.user as any).id as string, 10);

  const profile = await prisma.userGameProfile.findFirst({
    where: { userId },
    orderBy: { id: "asc" },
  });

  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex items-center justify-center">
        <div className="w-full max-w-xl space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-100">Create a Team</h1>
            <p className="text-sm text-slate-300">
              You need a game profile before creating a team. Go to your profile
              and create a game profile first.
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

  return (
    <main className="min-h-screen bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex items-center justify-center">
      <div className="w-full max-w-xl space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-100">Create a Team</h1>
          <p className="text-sm text-slate-300">
            Create a new team for your currently selected game.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
          <CreateTeamForm ranks={ranks} />
        </div>
      </div>
    </main>
  );
}