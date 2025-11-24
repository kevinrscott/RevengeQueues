import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
      <h1 className="text-xl font-semibold">Home</h1>
    </div>
  );
}