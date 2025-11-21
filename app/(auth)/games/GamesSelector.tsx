"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Game = {
  id: number;
  name: string;
  shortCode: string;
};

export default function GameSelector({ games }: { games: Game[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(gameId: number) {
    setError(null);
    setLoadingId(gameId);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gameId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }


      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Failed to select game");
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 text-center">
          {error}
        </p>
      )}

      <div className="grid gap-3">
        {games.map((game) => (
          <button
            key={game.id}
            type="button"
            onClick={() => handleSelect(game.id)}
            disabled={loadingId === game.id}
            className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:border-cyan-500 hover:shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="text-left">
              <div className="font-semibold text-gray-900">
                {game.name}
              </div>
              <div className="text-xs text-gray-500">
                {game.shortCode}
              </div>
            </div>
            <span className="text-sm font-medium text-cyan-600">
              {loadingId === game.id ? "Selecting..." : "Select"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
