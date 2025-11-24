import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { redirect } from "next/navigation";

export default async function TournamentPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-slate-900 to-cyan-900 p-6 text-white">
        <div className="w-full max-w-4xl bg-slate-900 rounded-xl shadow-lg p-4">
        <h1 className="text-white text-2xl font-semibold mb-4">
          Tournament Bracket
        </h1>

        <div className="w-full aspect-[16/9]">
          <iframe
            src="https://challonge.com/pw4ouw4p/module"
            width="100%"
            height="500"
            frameBorder="0"
            scrolling="auto"
          />
        </div>
      </div>
    </div>
  );
}