"use client";

import { useState } from "react";

export default function LookingForTeamToggle({
  profileId,
  initialLooking,
  maxTeamsReached,
}: {
  profileId: number;
  initialLooking: boolean;
  maxTeamsReached: boolean;
}) {
  const [looking, setLooking] = useState(initialLooking);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (maxTeamsReached) return;

    const next = !looking;
    setLooking(next);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/lft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          lookingForTeam: next,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update status.");
        setLooking(!next);
      }
    } catch (e) {
      console.error(e);
      setError("Unexpected error.");
      setLooking(!next);
    } finally {
      setLoading(false);
    }
  }

  const baseBtn =
    "rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed";

  const enabledClasses = looking
    ? "bg-red-800 hover:bg-red-600"
    : "bg-emerald-600 hover:bg-emerald-500";

  const disabledClasses = "bg-emerald-700";

  const label = loading
    ? "Saving..."
    : looking
    ? "Disable Invites"
    : "Enable Invites";

  return (
    <div className="relative flex flex-col items-start gap-1 group">
      <button
        onClick={toggle}
        disabled={loading || maxTeamsReached}
        className={`${baseBtn} ${
          maxTeamsReached ? disabledClasses : enabledClasses
        }`}
      >
        {label}
      </button>

      {maxTeamsReached && (
        <div className="pointer-events-none absolute top-[110%] left-0 z-10 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-slate-100 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
          You&apos;re already in 3 teams. Leave one to enable invites.
        </div>
      )}

      {error && (
        <span className="text-[10px] text-red-400 leading-tight">
          {error}
        </span>
      )}
    </div>
  );
}