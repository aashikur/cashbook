# 03 - Authentication & Tenant Security (Better Auth)

This guide documents the implementation of authentication, Google OAuth unification, session management, and tenant route protection.

---

## 1. Why Better Auth?

1. **Database-backed**: User tables (`user`, `session`, `account`, `verification`) live directly inside your PostgreSQL database via Drizzle adapter.
2. **Account Linking**: Automatically unifies user identities if an email/password user later signs in using Google OAuth with the identical email address.
3. **No Pricing Shock**: Avoids MAU (Monthly Active User) SaaS cost models over 10–15 years.

---

## 2. Server Setup (`src/lib/auth.ts`) & Route Handler

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
    },
  },
  plugins: [nextCookies()],
});
```

And in `src/app/api/auth/[...all]/route.ts`:
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

---

## 3. Middleware Protection (`src/middleware.ts`)

- Intercepts incoming requests.
- Protects all `/dashboard`, `/orgs/*`, and `/api/v1/*` routes.
- Whitelists `/sign-in`, `/sign-up`, and `/api/auth/*`.
- Redirects unauthenticated traffic to `/sign-in`.

---

## 4. RBAC Tenant Guard (`src/lib/auth-helpers.ts`)

```typescript
export async function requireOrgMember(orgId: string, requiredRole?: "admin")
```
Every API mutation checks active membership in `org_members`. Non-members receive `403 Forbidden`.
