"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ManageMemberButtonProps = {
  slug: string;
  membershipId: number;
  username: string;
  currentRole: string;
};

const ROLE_OPTIONS = [
  { value: "Member", label: "Member" },
  { value: "Manager", label: "Manager" },
];

export default function ManageMemberButton({
  slug,
  membershipId,
  username,
  currentRole,
}: ManageMemberButtonProps) {
  const [open, setOpen] = useState(false);
  const [kickOpen, setKickOpen] = useState(false);

  const [role, setRole] = useState(currentRole || "Member");
  const [loading, setLoading] = useState(false);
  const [kickLoading, setKickLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [kickError, setKickError] = useState<string | null>(null);

  const router = useRouter();

  function openModal() {
    setError(null);
    setRole(currentRole || "Member");
    setOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setOpen(false);
  }

  function openKickModal() {
    setKickError(null);
    setKickOpen(true);
  }

  function closeKickModal() {
    if (kickLoading) return;
    setKickOpen(false);
  }

  // -----------------------
  // UPDATE ROLE
  // -----------------------
  async function handleSaveRole() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/members/${membershipId}/role`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update role.");
        setLoading(false);
        return;
      }

      router.refresh();
      setOpen(false);
    } catch (err) {
      console.error(err);
      setError("Unexpected error. Please try again.");
      setLoading(false);
    }
  }

  // -----------------------
  // KICK MEMBER
  // -----------------------
  async function handleKick() {
    setKickLoading(true);
    setKickError(null);

    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/members/${membershipId}/kick`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setKickError(data.error || "Failed to remove member.");
        setKickLoading(false);
        return;
      }

      router.refresh();
      setKickOpen(false);
      setOpen(false);
    } catch (err) {
      console.error(err);
      setKickError("Unexpected error. Please try again.");
      setKickLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-100 hover:bg-slate-700"
      >
        Manage
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-100">
              Manage {username}
            </h3>

            <div className="space-y-2 text-sm text-slate-200">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-300">Role</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={openKickModal}
                className="rounded-md border border-red-500 bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                Kick from team
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={closeModal}
                  className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveRole}
                  className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save role"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {kickOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={closeKickModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-red-300">
              Remove {username}?
            </h3>

            <p className="text-sm text-slate-300">
              This will remove the member from the team. They will need a new invite to rejoin.
            </p>

            {kickError && (
              <p className="text-xs text-red-400">{kickError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={kickLoading}
                onClick={closeKickModal}
                className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={kickLoading}
                onClick={handleKick}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {kickLoading ? "Removing..." : "Yes, remove member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}