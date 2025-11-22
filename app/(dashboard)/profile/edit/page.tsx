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
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const activeProfile = user.profiles[0] ?? null;

  return (
    <main className="min-h-screen bg-gradient-to-r from-slate-900 to-cyan-900 p-6 text-white flex items-center justify-center">
      <div className="w-full max-w-xl rounded-xl bg-stone-900 p-8 shadow-2xl space-y-6">
        <h1 className="text-3xl font-bold text-slate-100 text-center">
          Edit Profile
        </h1>
        <EditProfileForm
          initialUsername={user.username}
          initialRegion={user.region ?? ""}
          initialProfilePhoto={user.profilePhoto ?? ""}
          initialIngameName={activeProfile?.ingameName ?? ""}
          initialRank={activeProfile?.rank ?? ""}
        />
      </div>
    </main>
  );
}