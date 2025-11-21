import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";
import { redirect } from "next/navigation";

export default async function MyProfileRedirectPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const username = (session.user as any).username as string | undefined;

  if (!username) {
    redirect("/login");
  }

  redirect(`/profile/${username}`);
}