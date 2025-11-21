"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import LogoutButton from "@/app/components/LogoutButton";

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    "/profile": "Profile",
    "/teams": "Teams",
    "/scrims": "Scrims",
    "/settings": "Settings",
    "/home": "Home",
  };

  if (map[pathname]) return map[pathname];

  const match = Object.keys(map).find((key) => pathname.startsWith(key));
  if (match) return map[match];

  return "Dashboard";
}

export default function Topbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const title = getPageTitle(pathname);

  return (
    <header className="w-full border-b border-black bg-stone-900 px-4 py-5 flex justify-between items-center">
      <span className="text-lg font-semibold pl-2">{title}</span>

      <div className="relative">
        {session?.user?.name ? (
          <>
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-stone-900 font-bold text-sm text-stone-100 hover:bg-stone-800 transition"
            >
              <span>{session.user.name}</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-40 rounded-md bg-black border border-stone-700 shadow-lg text-sm z-50">
                <Link
                  href="/profile"
                  className="block px-3 py-2 hover:bg-stone-800 text-stone-100"
                  onClick={() => setOpen(false)}
                >
                  Profile
                </Link>

                <div className="border-t border-stone-700" />

                <div className="px-3 py-2">
                  <LogoutButton />
                </div>
              </div>
            )}
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm text-stone-300 hover:text-white underline"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
