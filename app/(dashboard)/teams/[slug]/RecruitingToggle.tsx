"use client";

import { useState } from "react";

export default function RecruitingToggle({
  slug,
  initialIsRecruiting,
}: {
  slug: string;
  initialIsRecruiting: boolean;
}) {
  const [isRecruiting, setIsRecruiting] = useState(initialIsRecruiting);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleRecruiting() {
    if (loading) return;
    setLoading(true);
    setError(null);

    const next = !isRecruiting;

    try {
      const res = await fetch("/api/teams/recruiting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          isRecruiting: next,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update recruiting status.");
        return;
      }

      setIsRecruiting(next);
    } catch (e) {
      console.error(e);
      setError("Unexpected error while updating status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      <button
        type="button"
        onClick={toggleRecruiting}
        disabled={loading}
        className={`inline-flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-md transition
            ${
            isRecruiting
                ? "bg-emerald-600 text-emerald-50 hover:bg-emerald-500"
                : "bg-slate-700 text-slate-100 hover:bg-slate-600"
            }
            disabled:opacity-60
        `}
        >
        {loading ? "Updating..." : isRecruiting ? "Currently Recruting" : "Not Recruiting"}
        </button>

      {error && (
        <span className="text-[10px] text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}