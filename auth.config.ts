import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _req) {
        if (!credentials) return null;

        const { identifier, password } = credentials as {
          identifier: string;
          password: string;
        };

        const userInDb = await prisma.user.findFirst({
          where: {
            OR: [{ email: identifier }, { username: identifier }],
          },
        });

        if (!userInDb) return null;

        const isValid = await bcrypt.compare(password, userInDb.passwordHash);
        if (!isValid) return null;

        return {
          id: String(userInDb.id),
          name: userInDb.username,
          email: userInDb.email,
        };
      },
    }),
  ],
};
