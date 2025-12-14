import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import type { User as PrismaUser } from "@prisma/client";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

type AppToken = JWT & {
  userId?: string;
  isGlobalAdmin?: boolean;
};

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Jelszó", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email ?? "").trim().toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        const dbUser = user as PrismaUser;

        return {
          id: dbUser.id, // NextAuth ezt várja
          email: dbUser.email,
          isGlobalAdmin: dbUser.isGlobalAdmin ?? false,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      const t = token as AppToken;

      if (user) {
        const u = user as PrismaUser;
        t.userId = u.id;
        t.isGlobalAdmin = (u as any).isGlobalAdmin ?? false;
      }

      return t;
    },

    async session({ session, token }) {
      const t = token as AppToken;

      if (session.user) {
        const u = session.user as Session["user"] & {
          id?: string;
          isGlobalAdmin?: boolean;
        };

        if (t.userId) u.id = String(t.userId);
        if (typeof t.isGlobalAdmin === "boolean") u.isGlobalAdmin = t.isGlobalAdmin;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
