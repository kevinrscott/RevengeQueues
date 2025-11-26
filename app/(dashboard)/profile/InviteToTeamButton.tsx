"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type TeamSummary = { id: number; name: string };

export default function InviteToTeamButton({
  targetUserId,
  teams,
  lookingForTeam,
}: {
  targetUserId: number;
  teams: TeamSummary[];
  lookingForTeam: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(
    teams[0]?.id ?? null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function openModal() {
    setError(null);
    setSuccess(null);
    setSelectedTeamId(teams[0]?.id ?? null);
    setIsOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setIsOpen(false);
  }

  async function handleSend() {
    if (!selectedTeamId) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/team-requests/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeamId,
          targetUserId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.error || "Failed to send invite.";
        setError(msg);
        setSuccess(null);
        return;
      }

      const teamName =
        teams.find((t) => t.id === selectedTeamId)?.name ?? "your team";
      const msg = `Invite sent from ${teamName}!`;
      setSuccess(msg);
      setError(null);
      setIsOpen(false); // close modal, but keep success for profile banner
    } catch (err) {
      console.error(err);
      setError("Unexpected error sending invite.");
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  }

  const modal =
    mounted && isOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={closeModal}
          >
            <div
              className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Select a Team</h3>
                <button
                  onClick={closeModal}
                  className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
                >
                  Close
                </button>
              </div>

              {teams.length === 0 ? (
                <p className="text-sm text-slate-400">
                  You don&apos;t own or manage any teams to invite from.
                </p>
              ) : (
                <>
                  <p className="text-xs text-slate-400 mb-1">
                    Choose which team you want to send this invite from.
                  </p>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {teams.map((t) => (
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

                  {error && (
                    <p className="text-xs text-red-400 mt-1">{error}</p>
                  )}
                  {success && (
                    <p className="text-xs text-emerald-400 mt-1">{success}</p>
                  )}

                  <button
                    disabled={!selectedTeamId || loading}
                    onClick={handleSend}
                    className="w-full mt-3 text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {loading ? "Sending Invite..." : "Send Invite"}
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
        onClick={lookingForTeam ? openModal : undefined}
        disabled={!lookingForTeam}
        className={
            "rounded-lg px-4 py-2 text-xs font-semibold transition " +
            (lookingForTeam
            ? "bg-emerald-600 text-white hover:bg-emerald-500"
            : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60")
        }
        >
        {lookingForTeam ? "Invite to Team" : "Not Looking For Team"}
        </button>

        {success && (
          <span className="text-[11px] text-emerald-400">{success}</span>
        )}
        {error && <span className="text-[11px] text-red-400">{error}</span>}
      </div>

      {modal}
    </>
  );
}