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
    select: {
      username: true,
      region: true,
      profilePhoto: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gradient-to-r from-slate-900 to-cyan-900 p-6 text-white">
      <div className="mx-auto w-full max-w-xl rounded-xl bg-stone-900 p-8 shadow-2xl space-y-6">
        <h1 className="text-3xl font-bold text-slate-100">Edit Profile</h1>
        <EditProfileForm
          initialUsername={user.username}
          initialRegion={user.region ?? ""}
          initialProfilePhoto={user.profilePhoto ?? ""}
        />
      </div>
    </main>
  );
}
