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
  viewerId,
  viewerProfile,
}: {
  currentGame: Game;
  ranks: Rank[];
  initialLftProfiles: UserGameProfile[];
  initialLfpTeams: Team[];
  viewerId: number | null;
  viewerProfile: UserGameProfile;
}) {
  // Store lists in state so we can live-update them
  const [lftProfiles, setLftProfiles] = useState<UserGameProfile[]>(initialLftProfiles);
  const [lfpTeams, setLfpTeams] = useState<Team[]>(initialLfpTeams);

  // Track whether *this* user is looking for team
  const [viewerLooking, setViewerLooking] = useState<boolean>(
    viewerProfile.lookingForTeam
  );

  // Filter state (just rank filters now, game is fixed)
  const [playerRankFilter, setPlayerRankFilter] = useState<string>("");
  const [teamRankFilter, setTeamRankFilter] = useState<string>("");

  // Derived, filtered lists
  const filteredLftProfiles = lftProfiles.filter((p) => {
    if (!playerRankFilter) return true;
    return p.rank?.id === Number(playerRankFilter);
  });

  const filteredLfpTeams = lfpTeams.filter((t) => {
    if (!teamRankFilter) return true;
    return t.rank?.id === Number(teamRankFilter);
  });

  async function toggleLookingForTeam(looking: boolean) {
    // optimistic UI
    setViewerLooking(looking);
    setLftProfiles((prev) => {
      const exists = prev.some((p) => p.id === viewerProfile.id);

      if (looking) {
        if (exists) {
          return prev.map((p) =>
            p.id === viewerProfile.id ? { ...p, lookingForTeam: true } : p
          );
        }
        // add viewer to list
        return [...prev, { ...viewerProfile, lookingForTeam: true }];
      } else {
        // remove viewer from list
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
    setLfpTeams((prev) => {
      const team = prev.find((t) => t.id === teamId);
      if (!team) return prev;

      if (!recruiting) {
        return prev.filter((t) => t.id !== teamId);
      } else {
        return prev.map((t) =>
          t.id === teamId ? { ...t, isRecruiting: recruiting } : t
        );
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

      {/* 🔥 changed this wrapper only */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Looking for Team (players) */}
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
                    {p.game.shortCode} ·{" "}
                    {p.rank ? p.rank.name : "Unranked"} · W/L {p.wins}/
                    {p.losses}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Looking for Player (teams) */}
        <section className="flex-1 bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Looking for Player</h2>
            <p className="text-xs text-slate-400">
              Team owner/manager can toggle recruiting on their teams.
            </p>
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
                      {t.game.shortCode} ·{" "}
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
    </div>
  );
}