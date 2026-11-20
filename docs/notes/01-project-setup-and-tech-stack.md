# 01 - Project Setup & Architecture Fundamentals

## 1. Why this Stack?

| Technology | Why Chosen? | What it replaces |
| :--- | :--- | :--- |
| **Next.js 15 (App Router)** | Fullstack TypeScript, React Server Components + Route Handlers in a single repo | Separate Express/NestJS backend |
| **Tailwind CSS v4** | Instant styling, zero CSS runtime, `@import "tailwindcss";` | Bulky UI component libraries |
| **PostgreSQL + Drizzle ORM** | ACID compliant financial records, zero-overhead SQL, type safety | Prisma (heavy engine) or MongoDB |
| **Better Auth** | Self-hosted, stored in PostgreSQL, supports Google OAuth + Org RBAC | Clerk / Auth0 ($$$ per MAU over 15 years) |
| **Dexie.js (IndexedDB)** | Disk-backed local DB, handles hundreds of MBs + binary photo Blobs | LocalStorage (limited to 5MB, string-only) |
| **Cloudflare R2** | S3-compatible API with **$0 egress fees** | AWS S3 (costly bandwidth over 15 years) |
| **Zustand** | Minimalist in-memory state for active org & filter modals | Redux (too much boilerplate) |

---

## 2. Directory Structure (Senior Fullstack Architecture)

```
application/
├── docs/                      # Architectural specifications & study notes
│   ├── notes/                 # Step-by-step engineering guides
│   ├── project_scope_and_tech_stack.md
│   └── data_interfaces_and_api_endpoints.md
├── src/
│   ├── app/                   # Next.js App Router (pages & API routes)
│   │   ├── (auth)/            # Auth group: sign-in, sign-up
│   │   ├── (dashboard)/       # Protected views: dashboard, orgs, expenses
│   │   ├── api/
│   │   │   ├── auth/          # Better Auth catch-all route
│   │   │   └── v1/            # REST API endpoints (orgs, expenses, logs, sync)
│   │   ├── layout.tsx         # Root layout with fonts & global CSS
│   │   └── page.tsx           # Root redirector
│   ├── components/            # Modular React components
│   │   ├── layout/            # Headers, org switchers, navbars
│   │   ├── dashboard/         # Net worth cards, expense lists, quick modals
│   │   ├── logs/              # Daily log items & receipt viewer
│   │   └── ui/                # Buttons, inputs, modals, badges
│   ├── db/                    # Drizzle ORM database layer
│   │   ├── index.ts           # Neon serverless client connection
│   │   └── schema/            # Modular PostgreSQL tables & relations
│   ├── lib/                   # Shared backend & client utilities
│   │   ├── auth.ts            # Better Auth server configuration
│   │   ├── auth-client.ts     # Better Auth React client hooks
│   │   ├── auth-helpers.ts    # RBAC session & tenant verification guards
│   │   ├── local-db.ts        # Dexie.js offline database
│   │   ├── sync-service.ts    # Background delta sync & offline queue
│   │   ├── image-compression.ts# Client WebP canvas compressor
│   │   ├── r2.ts              # Cloudflare R2 presigned URL generator
│   │   └── utils.ts           # Currency, date, and fiscal period helpers
│   ├── store/                 # Zustand client stores
│   └── types/                 # Shared TypeScript interfaces & DTOs
└── drizzle.config.ts          # Drizzle Kit CLI migration settings
```

---

## 3. Step-by-Step Initialization Commands

If setting up from scratch on a new machine:

```bash
# 1. Initialize Next.js with TypeScript and Tailwind CSS
npx create-next-app@latest application --typescript --tailwind --eslint --app

# 2. Install Core Production Dependencies
npm install better-auth drizzle-orm @neondatabase/serverless zustand dexie dexie-react-hooks zod lucide-react clsx tailwind-merge resend @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# 3. Install Dev Dependencies
npm install -D drizzle-kit @types/node @types/react @types/react-dom
```
