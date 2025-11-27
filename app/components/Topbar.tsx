"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown, Bell } from "lucide-react";
import LogoutButton from "@/app/components/LogoutButton";

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    "/profile": "Profile",
    "/teams": "Teams",
    "/scrims": "Scrims",
    "/settings": "Settings",
    "/home": "Home",
    "/lfg": "LFG",
    "/tournaments": "Tournaments",
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
  slug: string;
};

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  teamName?: string | null;
  teamSlug?: string | null;
  fromUserName?: string | null;
  requestUserName?: string | null;
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

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [teamCount, setTeamCount] = useState(0);
  const MAX_TEAMS = 3;
  const hasReachedTeamLimit = teamCount >= MAX_TEAMS;

  const title = getPageTitle(pathname);
  const username = (session?.user as any)?.username as string | undefined;

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        notifRef.current &&
        !notifRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
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

  useEffect(() => {
    if (!session?.user) return;

    let cancelled = false;

    async function loadNotifications() {
      try {
        setNotifLoading(true);
        const res = await fetch("/api/notifications");
        if (!res.ok) throw new Error("Failed to load notifications");
        const data = await res.json();

        if (cancelled) return;

        setNotifications(data.notifications as NotificationItem[]);
        setUnreadCount(data.unreadCount as number);
        setTeamCount((data.teamCount as number) ?? 0);
      } catch (err) {
        console.error("Notifications error:", err);
      } finally {
        if (!cancelled) setNotifLoading(false);
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleNotificationAction(
    notificationId: number,
    action: "accept" | "reject"
  ) {
    try {
      const res = await fetch("/api/team-requests/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, action }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Action failed:", data.error || "Unknown error");
        return;
      }

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      if (action === "accept") {
        setTeamCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Action error:", err);
    }
  }

  const badgeText =
    unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <header className="w-full border-b border-black bg-slate-950 px-4 py-5 flex items-center justify-between">
      <span className="text-lg font-semibold pl-2 flex-shrink-0">
        {title}
      </span>

      <div className="flex items-center gap-4">
        {/* Search */}
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
            <div className="absolute mt-1 w-full rounded-md bg-slate-950 border border-slate-700 shadow-lg text-sm z-50 max-h-80 overflow-y-auto">
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
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 text-stone-100"
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
                      href={`/teams/${team.slug}`}
                      onClick={handleResultClick}
                      className="flex items-center justify-between px-3 py-2 hover:bg-slate-800 text-stone-100"
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

        {session?.user && (
          <div ref={notifRef} className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full
             transition transform hover:scale-110 hover:brightness-150"
            >
              <Bell size={18} className="text-slate-200" />
              {badgeText && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                  {badgeText}
                </span>
              )}
            </button>

            <div
              className={`absolute right-0 mt-2 w-80 rounded-md bg-slate-950 border border-slate-700 shadow-lg text-sm z-50 transition-opacity duration-150 ${
                notifOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Notifications
                </span>
                {notifLoading && (
                  <span className="text-[10px] text-slate-500">Loading...</span>
                )}
              </div>

              {notifications.length === 0 && !notifLoading && (
                <div className="px-3 py-3 text-xs text-slate-400">
                  No notifications yet.
                </div>
              )}

              {notifications.length > 0 && (
                <div className="max-h-80 overflow-y-auto py-1">
                  {notifications.map((n) => {
                    const isUnread = !n.readAt;
                    const isInvite = n.type === "TEAM_INVITE";
                    const isJoinRequest = n.type === "TEAM_JOIN_REQUEST";
                    const isActionable = isInvite || isJoinRequest;

                    const disableAccept = isInvite && hasReachedTeamLimit;

                    const teamLink = n.teamSlug
                      ? `/teams/${n.teamSlug}`
                      : undefined;

                    return (
                      <div
                        key={n.id}
                        className={`px-3 py-2 text-xs border-b border-slate-800 last:border-b-0 ${
                          isUnread ? "bg-slate-900" : "bg-slate-950"
                        }`}
                      >
                        <div className="flex justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-100">
                              {n.title}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {n.body}
                            </div>
                            {n.fromUserName && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                From:{" "}
                                <span className="font-medium">
                                  {n.fromUserName}
                                </span>
                              </div>
                            )}
                            {n.type === "TEAM_JOIN_REQUEST" && n.requestUserName && (
                            <div className="mt-1">
                              <Link
                                href={`/profile/${n.requestUserName}`}
                                className="text-[11px] text-cyan-400 hover:underline"
                              >
                                View user
                              </Link>
                            </div>
                          )}

                          {n.type !== "TEAM_JOIN_REQUEST" && teamLink && (
                            <div className="mt-1">
                              <Link
                                href={teamLink}
                                className="text-[11px] text-cyan-400 hover:underline"
                              >
                                View team
                              </Link>
                            </div>
                          )}
                          </div>
                        </div>

                        {isActionable && (
                        <div className="mt-2 flex gap-2">
                          <div className="relative flex-1 group">
                            <button
                              onClick={() =>
                                handleNotificationAction(n.id, "accept")
                              }
                              disabled={disableAccept}
                              className={`w-full rounded-md px-2 py-1 text-[11px] font-semibold text-white
                                ${
                                  disableAccept
                                    ? "bg-emerald-700 opacity-70 cursor-not-allowed"
                                    : "bg-emerald-600 hover:bg-emerald-500"
                                }`}
                            >
                              Accept
                            </button>
                            {disableAccept && (
                              <div className="pointer-events-none absolute top-[110%] left-0 z-10 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-slate-100 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                                Already in 3 teams (limit). Leave a team to accept.
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() =>
                              handleNotificationAction(n.id, "reject")
                            }
                            className="flex-1 rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-500"
                          >
                            Deny
                          </button>
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={userMenuRef} className="relative flex-shrink-0">
          {session?.user?.name ? (
            <>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
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

              <div
                className={`absolute right-0 mt-2 w-40 rounded-md bg-slate-950 border border-slate-700 shadow-lg text-sm z-50 transition-opacity duration-150 ${
                  userMenuOpen
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                <Link
                  href={username ? `/profile/${username}` : "/profile"}
                  className="block px-3 py-2 hover:bg-slate-700 text-stone-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Profile
                </Link>

                <Link
                  href="/teams"
                  className="block px-3 py-2 hover:bg-slate-700 text-stone-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Teams
                </Link>

                <div className="border-t border-stone-700" />

                <div className="px-3 py-2">
                  <LogoutButton />
                </div>
              </div>
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