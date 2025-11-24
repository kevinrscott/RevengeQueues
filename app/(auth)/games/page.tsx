import { prisma } from "@/app/lib/prisma";
import GameSelector from "./GamesSelector";
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { redirect } from "next/navigation";


export default async function GamePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const games = await prisma.game.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
      <div className="w-full max-w-lg space-y-6">
        <h1 className="text-4xl font-bold text-center">
          Select Game
        </h1>

        <p className="text-center text-gray-200 text-sm">
          Choose a game where you can manage your game profile, teams, and scrims.
        </p>

        <GameSelector games={games} />
      </div>
    </main>
  );
}
