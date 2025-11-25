import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import EditProfileForm from "./EditProfileForm";

export default async function EditProfilePage() {
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
    include: {
      profiles: {
        take: 1,
        include: {
          game: true,
          rank: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const activeProfile = user.profiles[0] ?? null;

  let ranks: { id: number; name: string }[] = [];
  if (activeProfile) {
    ranks = await prisma.gameRank.findMany({
      where: { gameId: activeProfile.gameId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
      },
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex items-center justify-center">
      <div className="w-full max-w-xl space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-100">Edit Profile</h1>
          <p className="text-sm text-slate-300">
            Update your profile details. Changes will be visible on your public profile.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
          <EditProfileForm
            initialUsername={user.username}
            initialRegion={user.region ?? ""}
            initialProfilePhoto={user.profilePhoto ?? ""}
            initialIngameName={activeProfile?.ingameName ?? ""}
            initialRankId={activeProfile?.rankId ?? null}
            profileId={activeProfile?.id ?? null}
            ranks={ranks}
          />
        </div>
      </div>
    </main>
  );
}