"use client";

import { useMemo, useState } from "react";

type Game = { id: number; name: string; shortCode: string };
type Rank = { id: number; name: string; order: number; gameId: number };

type TeamMembershipLite = {
  userId: number;
  role: string;
  user: { id: number; username: string };
};

type Team = {
  id: number;
  name: string;
  isRecruiting: boolean;
  logoUrl: string | null;
  game: Game;
  rank: Rank | null;
  memberships: TeamMembershipLite[];
};

type Scrim = {
  id: number;
  bestOf: number;
  gamemode: string;
  map: string;
  scrimCode: string | null;
  scheduledAt: string | null;
  status: string;
  hostTeam: Team;
  isHosted: boolean;
  isJoined: boolean;
  hostParticipantIds?: number[];

  matchedTeam?: Team | null;
  matchedParticipantIds?: number[];
};

export default function ScrimsClient({
  currentGame,
  viewerId,
  viewerTeams,
  initialScrims,
  viewerTeamsCount,
}: {
  currentGame: Game;
  viewerId: number | null;
  viewerTeams: Team[];
  initialScrims: Scrim[];
  viewerTeamsCount: number;
}) {
  const [scrims, setScrims] = useState<Scrim[]>(initialScrims);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  const [createHostTeamId, setCreateHostTeamId] = useState<number | null>(null);
  const [createBestOf, setCreateBestOf] = useState(3);
  const [createGamemode, setCreateGamemode] = useState("");
  const [createMap, setCreateMap] = useState("");
  const [createScheduledAt, setCreateScheduledAt] = useState<string>("");
  const [createScrimCode, setCreateScrimCode] = useState("");

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [joinTargetScrimId, setJoinTargetScrimId] = useState<number | null>(null);
  const [joinTeamId, setJoinTeamId] = useState<number | null>(null);
  const [joinSelectedMemberIds, setJoinSelectedMemberIds] = useState<number[]>([]);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [bestOfFilter, setBestOfFilter] = useState<string>("");

  const [detailsScrim, setDetailsScrim] = useState<Scrim | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createSelectedMemberIds, setCreateSelectedMemberIds] = useState<number[]>([]);

  const [manageScrim, setManageScrim] = useState<Scrim | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageScrimCode, setManageScrimCode] = useState<string>("");
  const [manageSaving, setManageSaving] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageSuccess, setManageSuccess] = useState<string | null>(null);
  const [manageConfirmDisband, setManageConfirmDisband] = useState(false);

  const hostableTeams = useMemo(
    () =>
      viewerId == null
        ? []
        : viewerTeams.filter((t) =>
            t.memberships.some(
              (m) =>
                m.userId === viewerId &&
                ["owner", "manager"].includes(m.role.toLowerCase())
            )
          ),
    [viewerId, viewerTeams]
  );

  const myScrims = useMemo(
    () =>
      scrims
        .filter((s) => s.isHosted || s.isJoined)
        .sort((a, b) => {
          if (a.isHosted === b.isHosted) return 0;
          return a.isHosted ? -1 : 1;
        }),
    [scrims]
  );

  const openScrims = useMemo(
    () =>
      scrims.filter((s) => {
        if (s.isHosted || s.isJoined) return false;

        const statusOk =
          !statusFilter ||
          s.status.toLowerCase() === statusFilter.toLowerCase();

        const bestOfOk =
          !bestOfFilter || s.bestOf === Number(bestOfFilter || 0);

        return statusOk && bestOfOk;
      }),
    [scrims, statusFilter, bestOfFilter]
  );

  async function handleCreateScrim() {
    if (!viewerId) {
      setCreateError("You must be logged in to create a scrim.");
      return;
    }
    if (!createHostTeamId) {
      setCreateError("Please select a host team.");
      return;
    }
    if (!createGamemode.trim() || !createMap.trim()) {
      setCreateError("Gamemode and map are required.");
      return;
    }
    if (createSelectedMemberIds.length === 0) {
      setCreateError("Please select at least one player for this scrim.");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const res = await fetch("/api/scrims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostTeamId: createHostTeamId,
          bestOf: createBestOf,
          gamemode: createGamemode.trim(),
          map: createMap.trim(),
          scheduledAt: createScheduledAt || null,
          hostParticipantIds: createSelectedMemberIds,
          scrimCode: createScrimCode.trim(), // NEW
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCreateError(data.error || "Failed to create scrim.");
        return;
      }

      const created: Scrim = {
        id: data.id,
        bestOf: data.bestOf,
        gamemode: data.gamemode,
        map: data.map,
        scrimCode: data.scrimCode,
        scheduledAt: data.scheduledAt ?? null,
        status: data.status,
        hostTeam: data.hostTeam,
        isHosted: true,
        isJoined: false,
        hostParticipantIds: data.hostParticipantIds ?? createSelectedMemberIds,
        matchedTeam: null,
        matchedParticipantIds: [],
      };

      setScrims((prev) => [created, ...prev]);
      setCreateSuccess("Scrim created successfully!");
      setCreateModalOpen(false);

      setCreateHostTeamId(null);
      setCreateBestOf(3);
      setCreateGamemode("");
      setCreateMap("");
      setCreateScheduledAt("");
      setCreateSelectedMemberIds([]);
      setCreateScrimCode("");
    } catch (err) {
      console.error(err);
      setCreateError("Unexpected error creating scrim.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleRequestJoin() {
    if (!viewerId) {
      setJoinError("You must be logged in to request to join a scrim.");
      return;
    }
    if (!joinTargetScrimId || !joinTeamId) {
      setJoinError("Please select a team.");
      return;
    }

    const team = hostableTeams.find((t) => t.id === joinTeamId);
    const allowedMemberIds = new Set(
      team?.memberships.map((m) => m.userId) ?? []
    );
    const memberIds = joinSelectedMemberIds.filter((id) =>
      allowedMemberIds.has(id)
    );

    if (!team) {
      setJoinError("Selected team is no longer available.");
      return;
    }

    if (memberIds.length === 0) {
      setJoinError("Please select at least one player for this scrim.");
      return;
    }

    setJoinLoading(true);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const res = await fetch("/api/scrim-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scrimId: joinTargetScrimId,
          teamId: joinTeamId,
          memberIds,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setJoinError(data.error || "Failed to send scrim join request.");
        return;
      }

      setJoinSuccess("Scrim request sent to the host team.");
      setJoinModalOpen(false);
      setJoinTargetScrimId(null);
      setJoinTeamId(null);
      setJoinSelectedMemberIds([]);
    } catch (err) {
      console.error(err);
      setJoinError("Unexpected error sending scrim request.");
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleSaveScrimCode() {
    if (!manageScrim) return;

    const trimmed = manageScrimCode.trim().toUpperCase();
    if (!trimmed) {
      setManageError("Scrim code cannot be empty.");
      return;
    }

    setManageSaving(true);
    setManageError(null);
    setManageSuccess(null);

    try {
      const res = await fetch(`/api/scrims/${manageScrim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scrimCode: trimmed }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setManageError(data.error || "Failed to update scrim.");
        return;
      }

      setScrims((prev) =>
        prev.map((s) =>
          s.id === manageScrim.id ? { ...s, scrimCode: data.scrimCode } : s
        )
      );
      setManageScrim((prev) =>
        prev ? { ...prev, scrimCode: data.scrimCode } : prev
      );

      setManageSuccess("Scrim updated.");
    } catch (err) {
      console.error(err);
      setManageError("Unexpected error updating scrim.");
    } finally {
      setManageSaving(false);
    }
  }

  async function handleDisbandScrim() {
    if (!manageScrim) return;

    setManageSaving(true);
    setManageError(null);
    setManageSuccess(null);

    try {
      const res = await fetch(`/api/scrims/${manageScrim.id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setManageError(data.error || "Failed to disband scrim.");
        return;
      }

      setScrims((prev) => prev.filter((s) => s.id !== manageScrim.id));
      setManageOpen(false);
      setManageScrim(null);
      setManageConfirmDisband(false);
    } catch (err) {
      console.error(err);
      setManageError("Unexpected error disbanding scrim.");
    } finally {
      setManageSaving(false);
    }
  }

  function formatDateTime(iso: string | null) {
    if (!iso) return "Time TBD";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Time TBD";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-black/40 backdrop-blur space-y-6">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              {currentGame.name} — Scrims
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Host practice matches and request to join other teams&apos; scrims for{" "}
              <span className="font-medium text-slate-200">
                {currentGame.shortCode}
              </span>
              .
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              You are currently on{" "}
              <span className="font-medium text-slate-200">
                {viewerTeamsCount}
              </span>{" "}
              team{viewerTeamsCount === 1 ? "" : "s"} (max 3).
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-slate-400">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 rounded-md bg-slate-950/60 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="open">Open Scrims</option>
                <option value="">Any Status</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wide text-slate-400">
                Best Of
              </label>
              <select
                value={bestOfFilter}
                onChange={(e) => setBestOfFilter(e.target.value)}
                className="mt-1 rounded-md bg-slate-950/60 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Any</option>
                <option value="1">Bo1</option>
                <option value="3">Bo3</option>
                <option value="5">Bo5</option>
              </select>
            </div>

            {hostableTeams.length > 0 && (
            <button
              onClick={() => {
                const defaultTeam = hostableTeams[0];
                setCreateHostTeamId(defaultTeam?.id ?? null);
                setCreateSelectedMemberIds(
                  defaultTeam ? defaultTeam.memberships.map((m) => m.userId) : []
                );
                setCreateModalOpen(true);
              }}
              className="ml-auto text-xs px-3 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Create Scrim
            </button>
          )}
          </div>
        </div>

        {(createError || createSuccess) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-3 ${
              createError
                ? "border-red-500 bg-red-950/80 text-red-100"
                : "border-emerald-500 bg-emerald-950/80 text-emerald-100"
            }`}
          >
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide">
              {createError ? "Scrim Creation Failed" : "Scrim Created"}
            </div>
            <p className="text-xs sm:text-sm">
              {createError || createSuccess}
            </p>
          </div>
        )}

        {(joinError || joinSuccess) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-3 ${
              joinError
                ? "border-red-500 bg-red-950/80 text-red-100"
                : "border-emerald-500 bg-emerald-950/80 text-emerald-100"
            }`}
          >
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide">
              {joinError ? "Scrim Request Failed" : "Scrim Request Sent"}
            </div>
            <p className="text-xs sm:text-sm">
              {joinError || joinSuccess}
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  Scrims You&apos;re In
                </h3>
                <p className="text-xs text-slate-400">
                  Scrims hosted by your teams, or ones your teams have joined.
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {myScrims.length === 0 && (
                <p className="text-sm text-slate-400">
                  You&apos;re not in any scrims yet. Create one or request to join.
                </p>
              )}

              {myScrims.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-slate-100">
                        {s.hostTeam.name} • Bo{s.bestOf} {s.gamemode}
                      </div>
                      {s.isHosted && (
                        <span className="text-[10px] uppercase tracking-wide rounded-full bg-emerald-900/60 border border-emerald-600 px-2 py-0.5 text-emerald-300">
                          Hosted
                        </span>
                      )}
                      {!s.isHosted && s.isJoined && (
                        <span className="text-[10px] uppercase tracking-wide rounded-full bg-sky-900/60 border border-sky-500 px-2 py-0.5 text-sky-300">
                          Joined
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400">
                      Map: {s.map} · {formatDateTime(s.scheduledAt)}
                    </div>
                    <div className="mt-1 text-xs">
                      <span className="text-slate-400">Scrim Code: </span>
                      {s.scrimCode ? (
                        <span className="font-mono text-slate-100">
                          {s.scrimCode}
                        </span>
                      ) : (
                        <span className="text-slate-500">Not set yet</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {s.isHosted ? (
                      <button
                        type="button"
                        onClick={() => {
                          setManageScrim(s);
                          setManageScrimCode(s.scrimCode ?? "");
                          setManageError(null);
                          setManageSuccess(null);
                          setManageConfirmDisband(false);
                          setManageOpen(true);
                        }}
                        className="text-[11px] px-3 py-1 rounded-full bg-emerald-700 hover:bg-emerald-600 whitespace-nowrap"
                      >
                        Manage Scrim
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsScrim(s);
                          setDetailsOpen(true);
                        }}
                        className="text-[11px] px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 whitespace-nowrap"
                      >
                        View details
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!s.scrimCode}
                      onClick={() => {
                        if (!s.scrimCode) return;
                        navigator.clipboard.writeText(s.scrimCode).catch(() => null);
                      }}
                      className="text-[11px] px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  Available Scrims
                </h3>
                <p className="text-xs text-slate-400">
                  Join scrims hosted by other teams.
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {openScrims.length === 0 && (
                <p className="text-sm text-slate-400">
                  No scrims match your filters right now.
                </p>
              )}

              {openScrims.map((s) => {
                const isHostTeamInViewerTeams =
                  !!viewerId &&
                  viewerTeams.some((t) => t.id === s.hostTeam.id);

                const canRequest =
                  !!viewerId &&
                  hostableTeams.length > 0 &&
                  !isHostTeamInViewerTeams;

                return (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-slate-100">
                        {s.hostTeam.name} • Bo{s.bestOf} {s.gamemode}
                      </div>
                      <div className="text-xs text-slate-400">
                        Map: {s.map} · {formatDateTime(s.scheduledAt)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Host rank: {s.hostTeam.rank?.name ?? "Any"} · Status:{" "}
                        <span className="uppercase">{s.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsScrim(s);
                          setDetailsOpen(true);
                        }}
                        className="text-[11px] px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 whitespace-nowrap"
                      >
                        View details
                      </button>

                      {canRequest && (
                        <button
                          onClick={() => {
                            const defaultTeam = hostableTeams[0];
                            setJoinTargetScrimId(s.id);
                            setJoinTeamId(defaultTeam?.id ?? null);
                            setJoinSelectedMemberIds(
                              defaultTeam
                                ? defaultTeam.memberships.map((m) => m.userId)
                                : []
                            );
                            setJoinModalOpen(true);
                          }}
                          className="text-xs px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 whitespace-nowrap"
                        >
                          Request with Team
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            if (!createLoading) setCreateModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">
                Create Scrim
              </h3>
              <button
                onClick={() => {
                  if (!createLoading) setCreateModalOpen(false);
                }}
                className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            {hostableTeams.length === 0 ? (
              <p className="text-sm text-slate-400">
                You need to own or manage a team in {currentGame.name} to host a
                scrim.
              </p>
            ) : (
              <div className="space-y-3 text-sm text-slate-100">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wide text-slate-400">
                    Host Team
                  </label>
                  <select
                    value={createHostTeamId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setCreateHostTeamId(val);

                      if (val) {
                        const team = hostableTeams.find((t) => t.id === val);
                        setCreateSelectedMemberIds(
                          team ? team.memberships.map((m) => m.userId) : []
                        );
                      } else {
                        setCreateSelectedMemberIds([]);
                      }
                    }}
                    className="w-full rounded-md bg-slate-950/60 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">Select a team</option>
                    {hostableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-slate-400">
                      Best Of
                    </label>
                    <select
                      value={createBestOf}
                      onChange={(e) =>
                        setCreateBestOf(Number(e.target.value || 3))
                      }
                      className="w-full rounded-md bg-slate-950/60 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value={1}>Bo1</option>
                      <option value={3}>Bo3</option>
                      <option value={5}>Bo5</option>
                    </select>
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-slate-400">
                      Gamemode
                    </label>
                    <input
                      value={createGamemode}
                      onChange={(e) => setCreateGamemode(e.target.value)}
                      className="w-full rounded-md bg-slate-950/60 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      placeholder="e.g. Hardpoint"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wide text-slate-400">
                    Map
                  </label>
                  <input
                    value={createMap}
                    onChange={(e) => setCreateMap(e.target.value)}
                    className="w-full rounded-md bg-slate-950/60 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    placeholder="e.g. Terminal"
                  />
                </div>

                {createHostTeamId && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wide text-slate-400">
                        Players for this scrim
                      </span>
                      <button
                        type="button"
                        className="text-[11px] text-cyan-400 hover:text-cyan-300"
                        onClick={() => {
                          const team = hostableTeams.find(
                            (t) => t.id === createHostTeamId
                          );
                          if (!team) return;
                          const allSelected =
                            createSelectedMemberIds.length ===
                            team.memberships.length;
                          if (allSelected) {
                            setCreateSelectedMemberIds([]);
                          } else {
                            setCreateSelectedMemberIds(
                              team.memberships.map((m) => m.userId)
                            );
                          }
                        }}
                      >
                        Toggle All
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      This doesn&apos;t change your team roster; it just marks who is
                      expected to play in this scrim.
                    </p>

                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {hostableTeams
                        .find((t) => t.id === createHostTeamId)
                        ?.memberships.map((m) => (
                          <label
                            key={m.userId}
                            className="flex items-center gap-2 text-xs text-slate-100"
                          >
                            <input
                              type="checkbox"
                              className="h-3 w-3"
                              checked={createSelectedMemberIds.includes(m.userId)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCreateSelectedMemberIds((prev) =>
                                  checked
                                    ? [...prev, m.userId]
                                    : prev.filter((id) => id !== m.userId)
                                );
                              }}
                            />
                            <span>{m.user.username}</span>
                            <span className="text-[10px] text-slate-500">
                              {m.role}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wide text-slate-400">
                    Scheduled Time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={createScheduledAt}
                    onChange={(e) => setCreateScheduledAt(e.target.value)}
                    className="w-full rounded-md bg-slate-950/60 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    If left blank, the scrim time can be decided later.
                  </p>
                </div>

                <button
                  onClick={handleCreateScrim}
                  disabled={createLoading}
                  className="w-full mt-2 text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create Scrim"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {joinModalOpen && joinTargetScrimId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            if (!joinLoading) {
              setJoinModalOpen(false);
              setJoinTargetScrimId(null);
              setJoinTeamId(null);
              setJoinSelectedMemberIds([]);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">
                Choose Team &amp; Players
              </h3>
              <button
                onClick={() => {
                  if (!joinLoading) {
                    setJoinModalOpen(false);
                    setJoinTargetScrimId(null);
                    setJoinTeamId(null);
                    setJoinSelectedMemberIds([]);
                  }
                }}
                className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            {hostableTeams.length === 0 ? (
              <p className="text-sm text-slate-400">
                You don&apos;t own or manage any teams to request with.
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-400">
                  Select which of your teams should request this scrim, then pick
                  which players will participate.
                </p>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 border-b border-slate-700 pb-2">
                  {hostableTeams.map((t) => (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                        joinTeamId === t.id
                          ? "border-emerald-500 bg-emerald-950/40"
                          : "border-slate-700 bg-slate-950/40"
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-100">{t.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {t.rank ? t.rank.name : "Any rank"} ·{" "}
                          {t.memberships.length} players
                        </div>
                      </div>
                      <input
                        type="radio"
                        className="h-4 w-4"
                        checked={joinTeamId === t.id}
                        onChange={() => {
                          setJoinTeamId(t.id);
                          setJoinSelectedMemberIds(
                            t.memberships.map((m) => m.userId)
                          );
                        }}
                      />
                    </label>
                  ))}
                </div>

                {joinTeamId && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wide text-slate-400">
                        Players for this scrim
                      </span>
                      <button
                        type="button"
                        className="text-[11px] text-cyan-400 hover:text-cyan-300"
                        onClick={() => {
                          const team = hostableTeams.find(
                            (t) => t.id === joinTeamId
                          );
                          if (!team) return;
                          const allSelected =
                            joinSelectedMemberIds.length ===
                            team.memberships.length;
                          if (allSelected) {
                            setJoinSelectedMemberIds([]);
                          } else {
                            setJoinSelectedMemberIds(
                              team.memberships.map((m) => m.userId)
                            );
                          }
                        }}
                      >
                        Toggle All
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      This doesn&apos;t change your team roster; it just tells the host
                      who you&apos;re planning to field and can be used for
                      notifications.
                    </p>

                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {hostableTeams
                        .find((t) => t.id === joinTeamId)
                        ?.memberships.map((m) => (
                          <label
                            key={m.userId}
                            className="flex items-center gap-2 text-xs text-slate-100"
                          >
                            <input
                              type="checkbox"
                              className="h-3 w-3"
                              checked={joinSelectedMemberIds.includes(m.userId)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setJoinSelectedMemberIds((prev) =>
                                  checked
                                    ? [...prev, m.userId]
                                    : prev.filter((id) => id !== m.userId)
                                );
                              }}
                            />
                            <span>{m.user.username}</span>
                            <span className="text-[10px] text-slate-500">
                              {m.role}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                <button
                  disabled={!joinTeamId || joinLoading}
                  onClick={handleRequestJoin}
                  className="w-full mt-2 text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                >
                  {joinLoading ? "Sending Request..." : "Send Scrim Request"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {detailsOpen && detailsScrim && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            setDetailsOpen(false);
            setDetailsScrim(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">
                Scrim Details
              </h3>
              <button
                onClick={() => {
                  setDetailsOpen(false);
                  setDetailsScrim(null);
                }}
                className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-100">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">
                  Overview
                </div>
                <div className="mt-1">
                  <div className="font-medium">
                    {detailsScrim.hostTeam.name} • Bo{detailsScrim.bestOf}{" "}
                    {detailsScrim.gamemode}
                  </div>
                  <div className="text-xs text-slate-400">
                    Map: {detailsScrim.map} ·{" "}
                    {formatDateTime(detailsScrim.scheduledAt)}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-300">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wide">
                    Host Team
                  </div>
                  <div>{detailsScrim.hostTeam.name}</div>
                  <div className="text-slate-400">
                    Rank: {detailsScrim.hostTeam.rank?.name ?? "Any"}
                  </div>
                  <div className="text-slate-400">
                    Recruiting:{" "}
                    {detailsScrim.hostTeam.isRecruiting ? "Yes" : "No"}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wide">
                    Scrim Meta
                  </div>

                  <div className="text-xs">
                    Code:{" "}
                    {detailsScrim.isHosted || detailsScrim.isJoined ? (
                      <span className="font-mono">{detailsScrim.scrimCode}</span>
                    ) : (
                      <span className="text-slate-500">
                        Join this scrim to see the code.
                      </span>
                    )}
                  </div>

                  <div>
                    Status:{" "}
                    <span className="uppercase">{detailsScrim.status}</span>
                  </div>
                  <div>
                    Scheduled: {formatDateTime(detailsScrim.scheduledAt)}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 mt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] uppercase tracking-wide text-slate-400">
                    Host lineup for this scrim
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  These are the players the host selected to play in this scrim.
                </p>

                <div className="space-y-1 max-h-40 overflow-y-auto pr-1 mt-2">
                  {detailsScrim.hostParticipantIds &&
                  detailsScrim.hostParticipantIds.length > 0 ? (
                    detailsScrim.hostTeam.memberships
                      .filter((m) =>
                        detailsScrim.hostParticipantIds?.includes(m.userId)
                      )
                      .map((m) => (
                        <div
                          key={m.userId}
                          className="flex items-center justify-between text-xs text-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <span>{m.user.username}</span>
                            <span className="text-[10px] text-slate-500">
                              {m.role}
                            </span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-[11px] text-slate-500">
                      No specific lineup selected yet.
                    </div>
                  )}
                </div>
              </div>

              {detailsScrim.matchedTeam && (
                <div className="border-t border-slate-800 pt-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] uppercase tracking-wide text-slate-400">
                      Opponent lineup for this scrim
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    These are the players the opponent selected to play in this scrim.
                  </p>

                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1 mt-2">
                    {detailsScrim.matchedParticipantIds &&
                    detailsScrim.matchedParticipantIds.length > 0 ? (
                      detailsScrim.matchedTeam.memberships
                        .filter((m) =>
                          detailsScrim.matchedParticipantIds?.includes(m.userId)
                        )
                        .map((m) => (
                          <div
                            key={m.userId}
                            className="flex items-center justify-between text-xs text-slate-100"
                          >
                            <div className="flex items-center gap-2">
                              <span>{m.user.username}</span>
                              <span className="text-[10px] text-slate-500">
                                {m.role}
                              </span>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-[11px] text-slate-500">
                        No specific lineup selected yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
      {manageOpen && manageScrim && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            if (!manageSaving) {
              setManageOpen(false);
              setManageScrim(null);
              setManageConfirmDisband(false);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">
                Manage Scrim
              </h3>
              <button
                onClick={() => {
                  if (!manageSaving) {
                    setManageOpen(false);
                    setManageScrim(null);
                    setManageConfirmDisband(false);
                  }
                }}
                className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            {(manageError || manageSuccess) && (
              <div
                className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${
                  manageError
                    ? "border-red-500 bg-red-950/80 text-red-100"
                    : "border-emerald-500 bg-emerald-950/80 text-emerald-100"
                }`}
              >
                <div className="mt-0.5 font-semibold uppercase tracking-wide">
                  {manageError ? "Update Failed" : "Scrim Updated"}
                </div>
                <p>{manageError || manageSuccess}</p>
              </div>
            )}

            <div className="space-y-3 text-sm text-slate-100">
              {/* Same overview as details modal */}
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">
                  Overview
                </div>
                <div className="mt-1">
                  <div className="font-medium">
                    {manageScrim.hostTeam.name} • Bo{manageScrim.bestOf}{" "}
                    {manageScrim.gamemode}
                  </div>
                  <div className="text-xs text-slate-400">
                    Map: {manageScrim.map} ·{" "}
                    {formatDateTime(manageScrim.scheduledAt)}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-300">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wide">
                    Host Team
                  </div>
                  <div>{manageScrim.hostTeam.name}</div>
                  <div className="text-slate-400">
                    Rank: {manageScrim.hostTeam.rank?.name ?? "Any"}
                  </div>
                  <div className="text-slate-400">
                    Recruiting:{" "}
                    {manageScrim.hostTeam.isRecruiting ? "Yes" : "No"}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wide">
                    Scrim Meta
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-slate-400">
                      Scrim Code
                    </label>
                    <input
                      value={manageScrimCode}
                      onChange={(e) =>
                        setManageScrimCode(e.target.value.toUpperCase())
                      }
                      className="w-full rounded-md bg-slate-950/60 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                      placeholder="e.g. ABC123"
                      maxLength={12}
                    />
                    <p className="text-[10px] text-slate-500">
                      This is the code your team will use in-game. It must be
                      unique.
                    </p>
                  </div>

                  <div>
                    Status:{" "}
                    <span className="uppercase">{manageScrim.status}</span>
                  </div>
                  <div>Scheduled: {formatDateTime(manageScrim.scheduledAt)}</div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 mt-2">
                <h4 className="text-[11px] uppercase tracking-wide text-slate-400">
                  Host lineup for this scrim
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  These are the players you selected to play in this scrim.
                </p>

                <div className="space-y-1 max-h-40 overflow-y-auto pr-1 mt-2">
                  {manageScrim.hostParticipantIds &&
                  manageScrim.hostParticipantIds.length > 0 ? (
                    manageScrim.hostTeam.memberships
                      .filter((m) =>
                        manageScrim.hostParticipantIds?.includes(m.userId)
                      )
                      .map((m) => (
                        <div
                          key={m.userId}
                          className="flex items-center justify-between text-xs text-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <span>{m.user.username}</span>
                            <span className="text-[10px] text-slate-500">
                              {m.role}
                            </span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-[11px] text-slate-500">
                      No specific lineup selected yet.
                    </div>
                  )}
                </div>
              </div>

              {manageScrim.matchedTeam && (
                <div className="border-t border-slate-800 pt-3 mt-4">
                  <h4 className="text-[11px] uppercase tracking-wide text-slate-400">
                    Opponent lineup for this scrim
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    These are the players the opponent selected to play in this
                    scrim.
                  </p>

                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1 mt-2">
                    {manageScrim.matchedParticipantIds &&
                    manageScrim.matchedParticipantIds.length > 0 ? (
                      manageScrim.matchedTeam!.memberships
                        .filter((m) =>
                          manageScrim.matchedParticipantIds?.includes(m.userId)
                        )
                        .map((m) => (
                          <div
                            key={m.userId}
                            className="flex items-center justify-between text-xs text-slate-100"
                          >
                            <div className="flex items-center gap-2">
                              <span>{m.user.username}</span>
                              <span className="text-[10px] text-slate-500">
                                {m.role}
                              </span>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-[11px] text-slate-500">
                        No specific lineup selected yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-800 pt-3 mt-2">
                <button
                  type="button"
                  onClick={handleSaveScrimCode}
                  disabled={manageSaving}
                  className="text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                >
                  {manageSaving ? "Saving..." : "Save Changes"}
                </button>

                <div className="space-y-2">
                  {!manageConfirmDisband ? (
                    <button
                      type="button"
                      onClick={() => setManageConfirmDisband(true)}
                      className="text-xs px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600"
                    >
                      Disband Scrim
                    </button>
                  ) : (
                    <div className="text-[11px] text-red-100 bg-red-950/60 border border-red-700 rounded-lg px-3 py-2 space-y-2">
                      <p>
                        Are you sure you want to disband this scrim? This
                        cannot be undone.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
                          onClick={() => setManageConfirmDisband(false)}
                          disabled={manageSaving}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-md bg-red-700 hover:bg-red-600 disabled:opacity-50"
                          onClick={handleDisbandScrim}
                          disabled={manageSaving}
                        >
                          {manageSaving ? "Disbanding..." : "Yes, disband"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}