import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _req) {
        if (!credentials?.identifier || !credentials.password) {
          return null;
        }

        const identifier = credentials.identifier as string;
        const isEmail = identifier.includes("@");

        const user = await prisma.user.findFirst({
          where: isEmail ? { email: identifier } : { username: identifier },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          name: user.username,
          email: user.email,
          username: user.username,
          image: user.profilePhoto ?? null,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const t = token as any;
      const u = user as any;

      if (user) {
        t.id = u.id;
        t.name = u.name;
        t.email = u.email;
        t.username = u.username;
        t.picture = u.image ?? null;
      }

      if (trigger === "update" && session) {
        const s = session as any;

        if (s.username) t.username = s.username;
        if (s.image) t.picture = s.image;
        if (s.name) t.name = s.name;
      }

      return token;
    },

    async session({ session, token }) {
      const t = token as any;

      if (session.user) {
        session.user.name = (t.name as string) ?? session.user.name;
        session.user.email = (t.email as string) ?? session.user.email;
        session.user.image = (t.picture as string | null) ?? null;

        (session.user as any).id = t.id;
        (session.user as any).username = t.username;
      }

      return session;
    },
  },
};

export default authOptions;
