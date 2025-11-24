"use client";

import { useEffect, useState, useRef } from "react";
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

type PlayerResult = {
  id: number;
  username: string;
  region: string | null;
  profilePhoto: string | null;
};

type TeamResult = {
  id: number;
  name: string;
  region: string;
  logoUrl: string | null;
};

export default function Topbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [teams, setTeams] = useState<TeamResult[]>([]);

  const title = getPageTitle(pathname);

  const searchRef = useRef<HTMLDivElement>(null);
  const username = (session?.user as any)?.username as string | undefined;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = searchTerm.trim();

    if (trimmed.length < 3) {
      setPlayers([]);
      setTeams([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");

        const data = (await res.json()) as {
          players: PlayerResult[];
          teams: TeamResult[];
        };

        setPlayers(data.players);
        setTeams(data.teams);
        setSearchOpen(true);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Search error", err);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchTerm]);

  const hasResults = players.length > 0 || teams.length > 0;

  function handleResultClick() {
    setSearchTerm("");
    setPlayers([]);
    setTeams([]);
    setSearchOpen(false);
  }

  return (
    <header className="w-full border-b border-black bg-slate-950 px-4 py-5 flex items-center justify-between">
      <span className="text-lg font-semibold pl-2 flex-shrink-0">
        {title}
      </span>

      <div className="flex items-center gap-4">
        <div ref={searchRef} className="relative flex-1 max-w-2xl">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (hasResults) setSearchOpen(true);
            }}
            placeholder="Search players or teams..."
            className="w-full min-w-[350px] max-w-[600px] rounded-md bg-slate-800 border border-slate-600 px-4 py-2 text-sm text-slate-300 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />

          {searchOpen && (hasResults || searchLoading) && (
            <div className="absolute mt-1 w-full rounded-md bg-black border border-stone-700 shadow-lg text-sm z-50 max-h-80 overflow-y-auto">
              {searchLoading && (
                <div className="px-3 py-2 text-xs text-slate-400">
                  Searching...
                </div>
              )}

              {!searchLoading && !hasResults && (
                <div className="px-3 py-2 text-xs text-slate-400">
                  No matches found.
                </div>
              )}

              {!searchLoading && players.length > 0 && (
                <div className="py-1">
                  <div className="px-3 pb-1 text-[10px] uppercase tracking-wide text-slate-500">
                    Players
                  </div>

                  {players.map((player) => (
                    <Link
                      key={`player-${player.id}`}
                      href={`/profile/${player.username}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-stone-800 text-stone-100"
                    >
                      <div className="h-7 w-7 rounded-full bg-stone-800 flex items-center justify-center text-xs font-semibold">
                        {player.username[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="text-xs font-medium">
                          {player.username}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {player.region ?? "No region set"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {!searchLoading && teams.length > 0 && (
                <div className="py-1 border-t border-stone-800">
                  <div className="px-3 pb-1 text-[10px] uppercase tracking-wide text-slate-500">
                    Teams
                  </div>

                  {teams.map((team) => (
                    <Link
                      key={`team-${team.id}`}
                      href={`/teams/${team.id}`}
                      onClick={handleResultClick}
                      className="flex items-center justify-between px-3 py-2 hover:bg-stone-800 text-stone-100"
                    >
                      <div>
                        <div className="text-xs font-medium">{team.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {team.region}
                        </div>
                      </div>
                      <span className="text-[10px] text-cyan-400">
                        View team
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative flex-shrink-0">
          {session?.user?.name ? (
            <>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 font-bold text-sm text-stone-100 hover:bg-slate-700 transition"
              >
                <span>{session.user.name}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-md bg-slate-950 border border-slate-700 shadow-lg text-sm z-50">
                  <Link
                    href={username ? `/profile/${username}` : "/profile"}
                    className="block px-3 py-2 hover:bg-stone-800 text-stone-100"
                    onClick={() => setUserMenuOpen(false)}
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
      </div>
    </header>
  );
}