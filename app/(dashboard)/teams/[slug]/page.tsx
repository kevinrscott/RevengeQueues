import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import DisbandTeamButton from "./DisbandTeamButton";
import LeaveTeamButton from "./LeaveTeamButton";
import ManageMemberButton from "./ManageMemberButton";
import RecruitingToggle from "./RecruitingToggle";

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

  const viewerMembership =
    team.memberships.find((m) => m.userId === userId) ?? null;

  const viewerRole = viewerMembership
    ? viewerMembership.role.toLowerCase()
    : null;

  const isOwner =
    viewerMembership && viewerMembership.role.toLowerCase() === "owner";

  const canLeave =
    viewerMembership && viewerMembership.role.toLowerCase() !== "owner";

  const ownerMembership =
    team.memberships.find((m) => m.role.toLowerCase() === "owner") ?? null;

  const otherMembers = team.memberships.filter((m) => m !== ownerMembership);

  const createdDate = team.createdAt
    ? new Date(team.createdAt).toLocaleDateString()
    : null;

  const memberCount = team.memberships.length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-8 md:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Team</h1>
            <p className="text-sm text-slate-400">
              View team details, recruiting status, and roster.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
            {(viewerRole === "owner" || viewerRole === "manager") && (
              <>
                {isOwner && (
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-200">
                    You are the team owner
                  </span>
                )}

                <Link
                  href={`/teams/${team.slug}/edit`}
                  className="inline-flex h-8 items-center justify-center rounded-md bg-slate-100 px-3 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-white"
                >
                  Edit Team
                </Link>

                <RecruitingToggle
                  slug={team.slug}
                  initialIsRecruiting={team.isRecruiting}
                />

                {isOwner && (
                  <DisbandTeamButton slug={team.slug} teamName={team.name} />
                )}
              </>
            )}

            {!isOwner && canLeave && (
              <LeaveTeamButton slug={team.slug} teamName={team.name} />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/40 backdrop-blur space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-900">
                {team.logoUrl ? (
                  <Image
                    src={team.logoUrl}
                    alt={`${team.name} logo`}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-200">
                    {team.name[0]?.toUpperCase() ?? "T"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-3xl font-bold text-slate-100">
                    {team.name}
                  </h2>

                  {team.rank && (
                    <span className="rounded-full bg-slate-950/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-100">
                      {team.rank.name}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span>
                    <span className="font-semibold text-slate-200">Game:</span>{" "}
                    {team.game?.name ?? "Unknown"}
                  </span>
                  <span>
                    <span className="font-semibold text-slate-200">Region:</span>{" "}
                    {team.region ?? "No region set"}
                  </span>
                  {createdDate && (
                    <span>
                      <span className="font-semibold text-slate-200">
                        Created:
                      </span>{" "}
                      {createdDate}
                    </span>
                  )}
                  <span>
                    <span className="font-semibold text-slate-200">
                      Members:
                    </span>{" "}
                    {memberCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Body: team info + members */}
          <div className="border-t border-slate-800/80 pt-5">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              {/* Left: Team details / bio */}
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Team Overview
                  </h3>
                  <dl className="space-y-2 text-sm text-slate-300">
                    <div>
                      <dt className="text-slate-400">Game</dt>
                      <dd className="font-medium text-slate-100">
                        {team.game?.name ?? "Unknown"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Region</dt>
                      <dd className="font-medium text-slate-100">
                        {team.region ?? "No region set"}
                      </dd>
                    </div>
                    {team.rank && (
                      <div>
                        <dt className="text-slate-400">Team Rank</dt>
                        <dd className="font-medium text-slate-100">
                          {team.rank.name}
                        </dd>
                      </div>
                    )}
                    {createdDate && (
                      <div>
                        <dt className="text-slate-400">Created on</dt>
                        <dd className="font-medium text-slate-100">
                          {createdDate}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Team Bio
                  </h3>
                  {team.bio ? (
                    <p className="whitespace-pre-line text-sm text-slate-200">
                      {team.bio}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      This team hasn&apos;t written a bio yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Members */}
              <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      Members
                    </h3>
                    <p className="text-xs text-slate-400">
                      Roster and roles for this team.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-300">
                    {memberCount} member
                    {memberCount === 1 ? "" : "s"}
                  </span>
                </div>

                {memberCount === 0 ? (
                  <p className="text-sm text-slate-300">
                    No members yet. Invite players to join your team.
                  </p>
                ) : (
                  <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                    {/* Owner first */}
                    {ownerMembership && (
                      <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
                        <Link
                          href={`/profile/${ownerMembership.user.username}`}
                          className="flex items-center gap-2 rounded-lg px-1 -mx-1 transition hover:bg-slate-800/60"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold">
                            {ownerMembership.user.username[0]?.toUpperCase() ??
                              "?"}
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              {ownerMembership.user.username}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Owner
                            </div>
                          </div>
                        </Link>
                        <div className="text-[10px] text-slate-400">
                          Joined{" "}
                          {new Date(
                            ownerMembership.joinedAt
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    )}

                    {/* Other members */}
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
                          <Link
                            href={`/profile/${m.user.username}`}
                            className="mr-2 flex items-center gap-2 rounded-lg px-1 transition hover:bg-slate-800/60"
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold">
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
                          </Link>

                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <span>
                              Joined{" "}
                              {new Date(m.joinedAt).toLocaleDateString()}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}