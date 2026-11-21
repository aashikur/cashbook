/**
 * Better Auth server configuration.
 * Docs ref: §2.1 Authentication — Email/Password + Google OAuth
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
  secret: process.env.BETTER_AUTH_SECRET || "default_local_dev_secret_32_characters_long_min",
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.105:3000",
    "http://192.168.*.*:3000",
    "http://10.*.*.*:3000",
    "https://cashbook.ashikbuilds.app",
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS
      ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((s) => s.trim())
      : []),
  ].filter(Boolean),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Default false until Resend is configured
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
