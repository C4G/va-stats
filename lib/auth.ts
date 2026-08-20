import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { customSession } from "better-auth/plugins";
import { createPool } from "mysql2/promise";
import { sendAuthEmail } from "./auth-email";

const database = createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  timezone: "Z",
  connectionLimit: 10,
});

type VaUser = {
  id: number;
  name: string | null;
  role: string | null;
};

async function findVaUser(email: string): Promise<VaUser | null> {
  const [rows] = await database.execute("SELECT id, name, role FROM vausers WHERE LOWER(email) = LOWER(?) LIMIT 1", [
    email,
  ]);

  return (rows as VaUser[])[0] ?? null;
}

const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL;
const rpID = process.env.BETTER_AUTH_RP_ID;

export const auth = betterAuth({
  appName: "Vision-Aid STATS",
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Reset your Vision-Aid STATS password",
        text: `Use this link to reset your Vision-Aid STATS password:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Verify your Vision-Aid STATS email",
        text: `Verify your email address to finish setting up Vision-Aid STATS:\n\n${url}\n\nIf you did not create this account, you can ignore this email.`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["openid", "email", "profile"],
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const vaUser = await findVaUser(user.email);
          if (!vaUser) {
            throw new APIError("FORBIDDEN", {
              message: "This email is not registered as a Vision-Aid staff account.",
            });
          }

          return {
            data: {
              ...user,
              name: vaUser.name || user.name,
            },
          };
        },
      },
    },
  },
  plugins: [
    passkey({
      rpName: "Vision-Aid STATS",
      ...(rpID ? { rpID } : {}),
      ...(baseURL ? { origin: baseURL } : {}),
    }),
    customSession(async ({ user, session }) => {
      const vaUser = await findVaUser(user.email);
      if (!vaUser) {
        throw new APIError("UNAUTHORIZED", {
          message: "This account no longer has access to Vision-Aid STATS.",
        });
      }

      return {
        session,
        user: {
          ...user,
          authId: user.id,
          id: vaUser.id,
          role: vaUser.role,
          name: vaUser.name || user.name,
        },
      };
    }),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
