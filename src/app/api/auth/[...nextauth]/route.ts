import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db"; // ha nálad máshol van a prisma kliens, ezt igazítsd
import type { User as PrismaUser } from "@prisma/client";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";


type AppToken = JWT & {
  id?: string;
  isGlobalAdmin?: boolean;
};

// Ezt fogjuk mindenhol használni (dashboard, API-k)
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "text",
        },
        password: {
          label: "Jelszó",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

          const isValid = await bcrypt.compare(
        credentials.password,
        user.password
      );

      if (!isValid) return null;

      const dbUser = user as PrismaUser;

      return {
        id: dbUser.id,
        email: dbUser.email,
        isGlobalAdmin: dbUser.isGlobalAdmin ?? false,
      };
      },
    }),
  ],
  pages: {
    signIn: "/login", // a te login oldalad
  },
        callbacks: {
    async jwt({ token, user }) {
      const appToken = token as AppToken;

      if (user) {
        const dbUser = user as PrismaUser;

        appToken.id = dbUser.id;
        appToken.isGlobalAdmin = dbUser.isGlobalAdmin ?? false;
      }

      return appToken;
    },

        async session({ session, token }) {
      if (session.user) {
        // session.user kibővítve extra mezőkkel
        const user = session.user as Session["user"] & {
          id?: string;
          isGlobalAdmin?: boolean;
        };

        const appToken = token as AppToken;

        if (appToken.id != null) {
          user.id = String(appToken.id);
        }
        if (typeof appToken.isGlobalAdmin === "boolean") {
          user.isGlobalAdmin = appToken.isGlobalAdmin;
        }
      }
      return session;
    },
  },


};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
