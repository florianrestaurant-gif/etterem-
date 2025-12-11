import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";

export const authConfig: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const email = (creds?.email || "").trim().toLowerCase();
        const password = creds?.password || "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
  async jwt({ token, user }) {
    if (user) {
      // a credentials providerben a user-nek van id-je
      const u = user as { id: string; email?: string };
      token.userId = u.id;
    }
    return token;
  },
  async session({ session, token }) {
    if (token?.userId) {
      // session.user biztosan létezik NextAuth-ban
      session.user = {
        ...session.user,
        id: token.userId,
      };
    }
    return session;
  },
},
};
