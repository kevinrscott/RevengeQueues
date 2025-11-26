"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeaveTeamButton({
  slug,
  teamName,
}: {
  slug: string;
  teamName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/leave`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to leave team.");
        setLoading(false);
        return;
      }

      router.push("/teams");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Unexpected error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs rounded-md border border-red-900 bg-red-700 px-3 py-1 font-semibold text-white hover:bg-red-800"
      >
        Leave Team
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-100">
              Leave {teamName}?
            </h3>
            <p className="text-sm text-slate-300">
              You will be removed from this team and lose access to its features. 
              You can rejoin only if you&apos;re invited again.
            </p>

            {error && (
              <p className="text-xs text-red-400">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {loading ? "Leaving..." : "Yes, leave team"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}