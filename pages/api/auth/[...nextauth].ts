// /pages/api/auth/[...nextauth].ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { executeQuery } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

type UserRow = RowDataPacket & { id: number; role: string };

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7, updateAge: 60 * 60 },

  // Use staging-style logger with explicit signatures
  logger: {
    error(code, metadata) {
      console.error("NextAuth Error:", code, metadata);
    },
    warn(code) {
      console.warn("NextAuth Warning:", code);
    },
    debug(code, metadata) {
      // keep debug hook; will only print when `debug` below is true
      console.log("NextAuth Debug:", code, metadata);
    },
  },

  // quieter in production
  debug: process.env.NODE_ENV !== "production",

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // ensure we always request email
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl);
        if (u.origin === baseUrl) return u.toString();
      } catch {
        /* noop */
      }
      return baseUrl;
    },

    async jwt({ token, user }) {
      // Seed token from user on login
      if (user) {
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
        (token as any).picture = (user as any).image ?? (token as any).picture;
      }

      // On login, enrich from DB and mark blocked if unknown
      if (user?.email) {
        try {
          const res = await executeQuery({
            query: "SELECT id, role FROM vausers WHERE email = ? LIMIT 1",
            values: [user.email],
          });
          const rows = Array.isArray(res) ? (res as UserRow[]) : [];
          if (rows.length === 0) {
            (token as any).blocked = true;
          } else {
            (token as any).userId = rows[0].id;
            (token as any).role = rows[0].role;

            // fire-and-forget last login
            void executeQuery({
              query: "UPDATE vausers SET lastlogin = NOW() WHERE id = ?",
              values: [rows[0].id],
            }).catch((e) => console.error("lastlogin update failed:", e));
          }
        } catch (e) {
          console.error("JWT DB lookup failed:", e);
          (token as any).dbError = true;
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Hard block
      if ((token as any)?.blocked) {
        (session as any).blocked = true;
        // Avoid partial/incorrect user object
        (session as any).user = undefined;
        return session;
      }

      // Merge: prefer existing session fields, fill from token
      const safeUser = {
        ...(session.user ?? {}),
        id: (token as any).userId ?? (session.user as any)?.id,
        role: (token as any).role ?? (session.user as any)?.role,
        email: (session.user as any)?.email ?? (token as any).email,
        name: (session.user as any)?.name ?? (token as any).name,
        image: (session.user as any)?.image ?? (token as any).picture ?? (token as any).image,
      };

      session.user = safeUser as typeof session.user;
      (session as any).dbError = (token as any).dbError || false;
      return session;
    },
  },
};

export default NextAuth(authOptions);
