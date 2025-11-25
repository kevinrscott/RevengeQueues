"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await signOut({ callbackUrl: "/" });
    } finally {
      // In practice you'll be redirected, but this keeps state tidy
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        type="button"
        className="text-xs rounded-md border border-red-500 bg-red-600/90 px-3 py-1 font-semibold text-white hover:bg-red-500"
      >
        Logout
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
            <h3 className="text-lg font-semibold text-red-300">
              Log out of your account?
            </h3>
            <p className="text-sm text-slate-300">
              You will be logged out and returned to the login page.
            </p>

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
                {loading ? "Logging out..." : "Yes, log me out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}