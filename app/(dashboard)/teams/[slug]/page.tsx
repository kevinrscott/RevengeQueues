import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import DisbandTeamButton from "./DisbandTeamButton";
import LeaveTeamButton from "./LeaveTeamButton";
import ManageMemberButton from "./ManageMemberButton";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TeamPage({ params }: PageProps) {
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
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!team) {
    notFound();
  }

  const isOwner = team.memberships.some(
    (m) => m.userId === userId && m.role.toLowerCase() === "owner"
  );

  const viewerMembership =
  team.memberships.find((m) => m.userId === userId) ?? null;

  const canLeave =
  viewerMembership &&
  viewerMembership.role.toLowerCase() !== "owner";

  const viewerRole = viewerMembership
  ? viewerMembership.role.toLowerCase()
  : null;

  const ownerMembership =
    team.memberships.find((m) => m.role.toLowerCase() === "owner") ?? null;

  const otherMembers = team.memberships.filter((m) => m !== ownerMembership);

  const createdDate = team.createdAt
    ? new Date(team.createdAt).toLocaleDateString()
    : null;

  return (
    <main className="flex min-h-screen justify-center bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-10 text-white">
      <div className="w-full max-w-3xl space-y-8">
        <section className="flex flex-col gap-6 rounded-xl border border-slate-700 bg-slate-900/70 p-5 md:flex-row md:items-center">
          <div className="flex items-center justify-center md:justify-start">
            <div className="h-24 w-24 rounded-full bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center text-xl font-semibold">
              {team.logoUrl ? (
                <Image
                  src={team.logoUrl}
                  alt={`${team.name} logo`}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{team.name[0]?.toUpperCase() ?? "T"}</span>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold">{team.name}</h1>

                  {team.isRecruiting && (
                    <span className="rounded-full border border-emerald-500/60 bg-emerald-900/30 px-3 py-0.5 text-xs font-semibold text-emerald-300">
                      Recruiting
                    </span>
                  )}
                </div>

                {isOwner && (
                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-300">
                      You are the team owner.
                    </span>

                    <Link
                      href={`/teams/${team.slug}/edit`}
                      className="inline-flex items-center justify-center rounded-md bg-slate-700 px-3 py-1.5 font-semibold text-slate-100 hover:bg-slate-600 transition"
                    >
                      Edit team
                    </Link>

                    <DisbandTeamButton slug={team.slug} teamName={team.name} />
                  </div>
                )}

                {!isOwner && canLeave && (
                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                    <LeaveTeamButton slug={team.slug} teamName={team.name} />
                  </div>
                )}
              </div>

              <div className="text-sm text-slate-300 space-y-1">
                <div>
                  <span className="font-semibold text-slate-100">Game:</span>{" "}
                  {team.game?.name ?? "Unknown"}
                </div>
                <div>
                  <span className="font-semibold text-slate-100">Region:</span>{" "}
                  {team.region ?? "No region set"}
                </div>
                {team.rank && (
                  <div>
                    <span className="font-semibold text-slate-100">
                      Team Rank:
                    </span>{" "}
                    {team.rank.name}
                  </div>
                )}
                {createdDate && (
                  <div className="text-xs text-slate-500">
                    Created on {createdDate}
                  </div>
                )}
              </div>

              {team.bio && (
                <p className="mt-2 text-sm text-slate-200 whitespace-pre-line">
                  {team.bio}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Members</h2>
            <span className="text-xs text-slate-400">
              {team.memberships.length} member
              {team.memberships.length === 1 ? "" : "s"}
            </span>
          </div>

          {team.memberships.length === 0 ? (
            <p className="text-sm text-slate-300">
              No members yet. Invite players to join your team.
            </p>
          ) : (
            <div className="space-y-2">
              {ownerMembership && (
                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold">
                      {ownerMembership.user.username[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {ownerMembership.user.username}
                      </div>
                      <div className="text-[10px] text-slate-400">Owner</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Joined{" "}
                    {new Date(ownerMembership.joinedAt).toLocaleDateString()}
                  </div>
                </div>
              )}

              {otherMembers.map((m) => {
                const memberRoleLower = (m.role || "member").toLowerCase();
                const canManageThisMember =
                  viewerRole &&
                  (viewerRole === "owner" ||
                    (viewerRole === "manager" &&
                      memberRoleLower !== "owner")) &&
                  m.userId !== userId;

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold">
                        {m.user.username[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {m.user.username}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {m.role || "Member"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>
                        Joined {new Date(m.joinedAt).toLocaleDateString()}
                      </span>
                      {canManageThisMember && (
                        <ManageMemberButton
                          slug={team.slug}
                          membershipId={m.id}
                          username={m.user.username}
                          currentRole={m.role || "Member"}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}