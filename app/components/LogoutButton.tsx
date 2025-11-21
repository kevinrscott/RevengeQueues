"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
      >
        Logout
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white p-6 rounded shadow-xl w-[300px] text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-black">Are you sure?</h2>
            <p className="text-sm text-black">
              You will be logged out of your account.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded transition shadow-md"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}