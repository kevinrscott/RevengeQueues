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
}: {
  currentGame: Game;
  ranks: Rank[];
  initialLftProfiles: UserGameProfile[];
  initialLfpTeams: Team[];
  manageableTeams: Team[];
  viewerId: number | null;
  viewerProfile: UserGameProfile;
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

  const filteredLftProfiles = lftProfiles.filter((p) => {
    if (!playerRankFilter) return true;
    return p.rank?.id === Number(playerRankFilter);
  });

  const filteredLfpTeams = lfpTeams.filter((t) => {
    if (!teamRankFilter) return true;
    return t.rank?.id === Number(teamRankFilter);
  });

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

  async function toggleLookingForTeam(looking: boolean) {
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
      await fetch("/api/lft", {
        method: "POST",
        body: JSON.stringify({
          profileId: viewerProfile.id,
          lookingForTeam: looking,
        }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleLookingForPlayers(teamId: number, recruiting: boolean) {
    // Keep myTeams in sync
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

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <section className="flex-1 bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Looking for Team</h2>

            {viewerProfile && (
              <button
                onClick={() => toggleLookingForTeam(!viewerLooking)}
                className="text-xs px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500"
              >
                {viewerLooking ? "Stop Looking for Team" : "Start Looking for Team"}
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {filteredLftProfiles.length === 0 && (
              <p className="text-sm text-slate-400">
                No players currently looking for a team.
              </p>
            )}
            {filteredLftProfiles.map((p) => (
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
              </div>
            ))}
          </div>
        </section>

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

      {showTeamModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
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
                        {t.game.shortCode} ·{" "}
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
    </div>
  );
}