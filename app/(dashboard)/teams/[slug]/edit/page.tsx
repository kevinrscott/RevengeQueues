import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { notFound, redirect } from "next/navigation";
import EditTeamForm from "./EditTeamForm";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditTeamPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any)?.id) {
    redirect("/login");
  }

  const userId = parseInt((session.user as any).id as string, 10);
  const { slug } = await params;

  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      game: true,
      rank: true,
      memberships: {
        include: { user: true },
      },
    },
  });

  if (!team) {
    notFound();
  }

  const isOwner = team.memberships.some(
    (m) => m.userId === userId && m.role.toLowerCase() === "owner"
  );

  if (!isOwner) {
    redirect(`/teams/${slug}`);
  }

  const ranks = await prisma.gameRank.findMany({
    where: { gameId: team.gameId },
    orderBy: { order: "asc" },
  });

  return (
    <main className="min-h-screen bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex items-center justify-center">
      <div className="w-full max-w-xl space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-100">Edit Team</h1>
          <p className="text-sm text-slate-300">
            Update your team details. Changes will be reflected on the team page.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
          <EditTeamForm
            slug={team.slug}
            initialName={team.name}
            initialRegion={team.region}
            initialBio={team.bio ?? ""}
            initialRankId={team.rankId ?? null}
            initialIsRecruiting={team.isRecruiting}
            initialLogoUrl={team.logoUrl}
            ranks={ranks.map((r) => ({ id: r.id, name: r.name }))}
          />
        </div>
      </div>
    </main>
  );
}