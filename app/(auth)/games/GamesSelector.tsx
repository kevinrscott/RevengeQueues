"use client";

import Image from "next/image";
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

  function getGameImage(shortCode: string): string {
    const code = shortCode.toUpperCase();
    if (code === "COD") return "/img/cod.jpg";
    return "/img/placeholder.jpg";
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <div className="grid gap-4 grid-cols-1">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => handleSelect(game.id)}
            disabled={loadingId === game.id}
            className="group relative w-full max-w-3xs mx-auto overflow-hidden rounded-xl outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="relative w-full overflow-hidden rounded-2xl border-3 border-stone-800">
              <Image
                src={getGameImage(game.shortCode)}
                alt={game.name}
                width={1600}
                height={900}
                className="w-full h-auto transition duration-200 group-hover:brightness-110 group-hover:scale-105"
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>

            <div className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-cyan-400/70 opacity-0 group-hover:opacity-100 group-hover:ring-2 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}