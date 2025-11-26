"use client";

import { useState } from "react";

type Game = { id: number; name: string; shortCode: string };
type Rank = { id: number; name: string; order: number; gameId: number };
type UserGameProfile = {
  id: number;
  ingameName: string;
  wins: number;
  losses: number;
  lookingForTeam: boolean;
  game: Game;
  rank: Rank | null;
  user: { id: number; username: string; region: string | null };
};

type Team = {
  id: number;
  name: string;
  isRecruiting: boolean;
  logoUrl: string | null;
  game: Game;
  rank: Rank | null;
  memberships: { user: { id: number; username: string }; role: string }[];
};

export default function LfgClient({
  currentGame,
  ranks,
  initialLftProfiles,
  initialLfpTeams,
  manageableTeams,
  viewerId,
  viewerProfile,
  viewerTeamsCount,
}: {
  currentGame: Game;
  ranks: Rank[];
  initialLftProfiles: UserGameProfile[];
  initialLfpTeams: Team[];
  manageableTeams: Team[];
  viewerId: number | null;
  viewerProfile: UserGameProfile;
  viewerTeamsCount: number;
}) {
  const [lftProfiles, setLftProfiles] = useState<UserGameProfile[]>(initialLftProfiles);
  const [lfpTeams, setLfpTeams] = useState<Team[]>(initialLfpTeams);
  const [myTeams, setMyTeams] = useState<Team[]>(manageableTeams);

  const [viewerLooking, setViewerLooking] = useState<boolean>(
    viewerProfile.lookingForTeam
  );

  const [playerRankFilter, setPlayerRankFilter] = useState<string>("");
  const [teamRankFilter, setTeamRankFilter] = useState<string>("");

  const [showTeamModal, setShowTeamModal] = useState(false);

  // Invite UI state
  const [inviteLoadingFor, setInviteLoadingFor] = useState<number | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteTargetUserId, setInviteTargetUserId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const manageableMyTeams =
    viewerId == null
      ? []
      : myTeams.filter((t) =>
          t.memberships.some(
            (m) =>
              m.user.id === viewerId &&
              ["owner", "manager"].includes(m.role.toLowerCase())
          )
        );

  const MAX_TEAMS = 3;
  const hasReachedTeamLimit = viewerTeamsCount >= MAX_TEAMS;

  async function sendInvite(targetUserId: number, teamId: number) {
    setInviteError(null);
    setInviteSuccess(null);
    setInviteLoadingFor(targetUserId);

    try {
      if (!viewerId) {
        setInviteError("You must be logged in to send invites.");
        return;
      }

      if (manageableMyTeams.length === 0) {
        setInviteError("You don't own or manage any teams to invite from.");
        return;
      }

      const res = await fetch("/api/team-requests/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          targetUserId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setInviteError(data.error || "Failed to send invite.");
        return;
      }

      const teamName =
        manageableMyTeams.find((t) => t.id === teamId)?.name ?? "your team";

      setInviteSuccess(`Invite to ${teamName} sent!`);
      setInviteModalOpen(false);
      setInviteTargetUserId(null);
    } catch (err) {
      console.error(err);
      setInviteError("Unexpected error sending invite.");
    } finally {
      setInviteLoadingFor(null);
    }
  }

  const filteredLftProfiles = lftProfiles.filter((p) => {
    if (!playerRankFilter) return true;
    return p.rank?.id === Number(playerRankFilter);
  });

  const filteredLfpTeams = lfpTeams.filter((t) => {
    if (!teamRankFilter) return true;
    return t.rank?.id === Number(teamRankFilter);
  });

  async function toggleLookingForTeam(looking: boolean) {
    if (looking && hasReachedTeamLimit) {
      console.warn("Already at max teams, cannot start looking for team.");
      return;
    }

    setViewerLooking(looking);
    setLftProfiles((prev) => {
      const exists = prev.some((p) => p.id === viewerProfile.id);

      if (looking) {
        if (exists) {
          return prev.map((p) =>
            p.id === viewerProfile.id ? { ...p, lookingForTeam: true } : p
          );
        }
        return [...prev, { ...viewerProfile, lookingForTeam: true }];
      } else {
        return prev.filter((p) => p.id !== viewerProfile.id);
      }
    });

    try {
      const res = await fetch("/api/lft", {
        method: "POST",
        body: JSON.stringify({
          profileId: viewerProfile.id,
          lookingForTeam: looking,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        setViewerLooking(!looking);
      }
    } catch (err) {
      console.error(err);
      setViewerLooking(!looking);
    }
  }

  async function toggleLookingForPlayers(teamId: number, recruiting: boolean) {
    setMyTeams((prev) =>
      prev.map((t) =>
        t.id === teamId ? { ...t, isRecruiting: recruiting } : t
      )
    );

    setLfpTeams((prev) => {
      const existing = prev.find((t) => t.id === teamId);

      if (recruiting) {
        if (existing) {
          return prev.map((t) =>
            t.id === teamId ? { ...t, isRecruiting: true } : t
          );
        }
        const fromMyTeams = myTeams.find((t) => t.id === teamId);
        if (!fromMyTeams) return prev;
        return [...prev, { ...fromMyTeams, isRecruiting: true }];
      } else {
        if (!existing) return prev;
        return prev.filter((t) => t.id !== teamId);
      }
    });

    try {
      await fetch("/api/lfp", {
        method: "POST",
        body: JSON.stringify({ teamId, isRecruiting: recruiting }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-8">
      {/* Filters */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Player Rank
          </label>
          <select
            value={playerRankFilter}
            onChange={(e) => setPlayerRankFilter(e.target.value)}
            className="mt-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            {ranks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Team Rank
          </label>
          <select
            value={teamRankFilter}
            onChange={(e) => setTeamRankFilter(e.target.value)}
            className="mt-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            {ranks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Invite status banner */}
      {(inviteError || inviteSuccess) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-3 ${
            inviteError
              ? "border-red-500 bg-red-950/80 text-red-100"
              : "border-emerald-500 bg-emerald-950/80 text-emerald-100"
          }`}
        >
          <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide">
            {inviteError ? "Invite Failed" : "Invite Sent"}
          </div>
          <p className="text-xs sm:text-sm">
            {inviteError || inviteSuccess}
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LFT column */}
        <section className="flex-1 bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Looking for Team</h2>

            {viewerProfile && (
              <div className="relative flex flex-col items-end gap-1 group">
                <button
                  onClick={() => toggleLookingForTeam(!viewerLooking)}
                  disabled={hasReachedTeamLimit}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition
                    ${
                      hasReachedTeamLimit
                        ? "bg-emerald-700 text-slate-200 opacity-70 cursor-not-allowed"
                        : viewerLooking
                        ? "bg-red-800 hover:bg-red-600 text-white"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                >
                  {viewerLooking ? "Stop Looking for Team" : "Start Looking for Team"}
                </button>

                {hasReachedTeamLimit && (
                  <div className="pointer-events-none absolute top-[115%] right-0 z-10 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-slate-100 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                    Already in 3 teams (limit). Leave a team to look for a new one.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {filteredLftProfiles.length === 0 && (
              <p className="text-sm text-slate-400">
                No players currently looking for a team.
              </p>
            )}
            {filteredLftProfiles.map((p) => {
              const isSelf = viewerId != null && p.user.id === viewerId;
              const canInvite =
                !isSelf && viewerId != null && manageableMyTeams.length > 0;

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-slate-950/50 rounded-lg px-3 py-2 border border-slate-800"
                >
                  <div>
                    <div className="font-medium">
                      {p.user.username}{" "}
                      <span className="text-xs text-slate-400">
                        ({p.ingameName})
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.rank ? p.rank.name : "Unranked"} · W/L {p.wins}/{p.losses}
                    </div>
                  </div>

                  {canInvite && (
                    <button
                      onClick={() => {
                        setInviteTargetUserId(p.user.id);
                        setSelectedTeamId(manageableMyTeams[0]?.id ?? null);
                        setInviteModalOpen(true);
                      }}
                      disabled={inviteLoadingFor === p.user.id}
                      className="text-xs px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
                    >
                      Invite to Team
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* LFP column */}
        <section className="flex-1 bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Looking for Player</h2>
              <p className="text-xs text-slate-400">
                Teams marked as recruiting will appear here.
              </p>
            </div>

            {manageableMyTeams.length > 0 && (
              <button
                onClick={() => setShowTeamModal(true)}
                className="text-xs px-3 py-1 rounded-full bg-slate-700 hover:bg-slate-600"
              >
                Manage Recruiting
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {filteredLfpTeams.length === 0 && (
              <p className="text-sm text-slate-400">
                No teams currently looking for players.
              </p>
            )}
            {filteredLfpTeams.map((t) => {
              const canManage =
                !!viewerId &&
                t.memberships.some(
                  (m) =>
                    m.user.id === viewerId &&
                    ["owner", "manager"].includes(m.role.toLowerCase())
                );

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-slate-950/50 rounded-lg px-3 py-2 border border-slate-800"
                >
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-slate-400">
                      {t.rank ? t.rank.name : "Any rank"} ·{" "}
                      {t.memberships.length} players
                    </div>
                  </div>

                  {canManage && (
                    <button
                      onClick={() =>
                        toggleLookingForPlayers(t.id, !t.isRecruiting)
                      }
                      className="text-xs px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-500"
                    >
                      {t.isRecruiting ? "Close Recruiting" : "Look for Players"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Manage Recruiting Modal */}
      {showTeamModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
          onClick={() => setShowTeamModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Manage Team Recruiting</h3>
              <button
                onClick={() => setShowTeamModal(false)}
                className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            {manageableMyTeams.length === 0 ? (
              <p className="text-sm text-slate-400">
                You don&apos;t own or manage any teams for {currentGame.name}.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {manageableMyTeams.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-slate-400">
                        {t.rank ? t.rank.name : "Any rank"} ·{" "}
                        {t.memberships.length} players
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Status: {t.isRecruiting ? "Recruiting" : "Not recruiting"}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        toggleLookingForPlayers(t.id, !t.isRecruiting)
                      }
                      className="text-xs px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-500 whitespace-nowrap"
                    >
                      {t.isRecruiting ? "Stop Recruiting" : "Look for Players"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Team Selection Modal */}
      {inviteModalOpen && inviteTargetUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            if (!inviteLoadingFor) {
              setInviteModalOpen(false);
              setInviteTargetUserId(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Select a Team</h3>
              <button
                onClick={() => {
                  if (!inviteLoadingFor) {
                    setInviteModalOpen(false);
                    setInviteTargetUserId(null);
                  }
                }}
                className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            {manageableMyTeams.length === 0 ? (
              <p className="text-sm text-slate-400">
                You don&apos;t own or manage any teams to invite from.
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-400">
                  Choose which team you want to send this invite from.
                </p>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {manageableMyTeams.map((t) => (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                        selectedTeamId === t.id
                          ? "border-emerald-500 bg-emerald-950/40"
                          : "border-slate-700 bg-slate-950/40"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {t.rank ? t.rank.name : "Any rank"} ·{" "}
                          {t.memberships.length} players
                        </div>
                      </div>
                      <input
                        type="radio"
                        className="h-4 w-4"
                        checked={selectedTeamId === t.id}
                        onChange={() => setSelectedTeamId(t.id)}
                      />
                    </label>
                  ))}
                </div>

                <button
                  disabled={
                    !selectedTeamId ||
                    inviteLoadingFor === inviteTargetUserId
                  }
                  onClick={() => {
                    if (!selectedTeamId || !inviteTargetUserId) return;
                    void sendInvite(inviteTargetUserId, selectedTeamId);
                  }}
                  className="w-full mt-2 text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                >
                  {inviteLoadingFor === inviteTargetUserId
                    ? "Sending Invite..."
                    : "Send Invite"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}