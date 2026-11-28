# CashBook (Modern Offline-First Ledger & Expense Tracker)

A clean, modern, offline-first multi-tenant financial ledger PWA built with **Next.js 15 (App Router)**, **React 19**, **Better Auth**, **Drizzle ORM**, and **Dexie.js (IndexedDB)**. Architected for 10–15 years of scale with integer minor unit financial precision and Cloudflare R2 presigned receipt uploads.

> **CashBook v1.1** — Designed & Developed by [Aashikur Rahaman](https://wa.me/8801580563883)

---

## 🚀 Key Features

- **Clean Fintech UI Aesthetic:** High-contrast, mobile-first design matching modern fintech interfaces.
- **Dynamic Theming via Global CSS Variables:** All colors, surfaces, borders, and brand accents are centralized in `globals.css` with zero hardcoded color classes.
- **Zero Raw Emojis:** Strictly modern SVG icons from `lucide-react`.
- **Haptic Tactile Feedback:** Universal click micro-compression (`scale(0.965)`) and tap highlight optimizations across all buttons and cards.
- **Offline-First PWA:** Reactive Dexie.js (IndexedDB) client storage with background delta synchronization and Service Worker caching.
- **Multi-Tenant RBAC:** Isolated organization workspaces with role-based access control (Admin vs. Viewer).
- **15-Year Financial Longevity:** Integer paisa/cent precision (`amountPaisa: integer`) eliminates floating-point drift.
- **Direct Receipt Uploads:** Cloudflare R2 presigned S3 URLs with client-side WebP image compression (\$0 egress fees).
- **Mobile Edge-to-Edge Layout:** Full-bleed `px-0` on mobile with `sm:px-4` breakpoint; `border-y sm:border rounded-none sm:rounded-2xl` for native app feel.
- **Focus-Search Mode:** Dedicated search header state that collapses the balance card and expands the search bar full-width.
- **Shared `BookActionsMenu`:** Reusable ⋮ dropdown component (Info / Edit / Archive) used consistently across Dashboard and Entry Books screens.
- **Unified Filter Popovers:** Date Range, Entry Type, Member, and Entries Limit filters use a consistent `fixed left-4 right-4 rounded-3xl sm:absolute sm:rounded-2xl` pattern with 48px minimum row height.
- **Consistent Modal System:** `BookDetailsModal` and `EditExpenseModal` share a flat, borderless design with `w-11 h-11` (44px) close buttons — no box-in-box nesting.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 15.5](https://nextjs.org/) (App Router, Turbopack, Server Actions, Route Handlers)
- **Library:** React 19
- **Database ORM:** [Drizzle ORM](https://orm.drizzle.team/) + PostgreSQL ([Neon Serverless](https://neon.tech))
- **Authentication:** [Better Auth](https://www.better-auth.com/) (Self-hosted, Google OAuth & Email)
- **Client Database:** [Dexie.js](https://dexie.org/) (IndexedDB wrapper) + `dexie-react-hooks`
- **Global State:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Styling:** Tailwind CSS v4 with custom `@theme` CSS custom properties
- **Icons:** [Lucide React](https://lucide.dev/) `^0.515.0`
- **Object Storage:** Cloudflare R2 via `@aws-sdk/client-s3`
- **PWA:** Custom `sw.js` Service Worker (`cashbook-pwa-v2`) with dev-only unregister + cache purge

---

## 📖 Step-by-Step Study Guide & Architecture Notes

Detailed engineering notes for learning and replication are documented in [`docs/notes/`](./docs/notes/):

1. [01. Project Setup & Tech Stack Rationale](./docs/notes/01-project-setup-and-tech-stack.md)
2. [02. Database Schema & 15-Year Precision Design](./docs/notes/02-database-schema-and-drizzle.md)
3. [03. Self-Hosted Better Auth & RBAC Isolation](./docs/notes/03-authentication-better-auth.md)
4. [04. REST API & Route Handlers](./docs/notes/04-rest-api-and-rbac.md)
5. [05. Offline-First Dexie Engine & Sync Sequence](./docs/notes/05-offline-first-dexie-and-sync.md)
6. [06. External Services Setup (Neon, R2, Google, Resend)](./docs/notes/06-external-services-guide.md)
7. [07. Clean Fintech UI & Tactile Feedback System](./docs/notes/07-clean-fintech-ui-and-tactile-system.md)

---

## 🆕 v1.1 UI Changelog

| Area | Change |
| :--- | :--- |
| **Mobile Layout** | Edge-to-edge `px-0` on all screens; `mx-4` inset on summary cards only |
| **PWA / SW** | Dev-mode Service Worker auto-unregister + `cashbook-pwa-v2` cache bump |
| **Hydration** | `suppressHydrationWarning` on `<html>` & `<body>` fixes extension conflicts |
| **Dashboard** | Focus-search mode collapses balance card; `BookActionsMenu` ⋮ dropdown |
| **BookActionsMenu** | New shared component — Info / Edit / Archive — reused in Dashboard + Entry Books |
| **BookDetailsModal** | Flat, borderless design; `w-11 h-11` close button; no box-in-box nesting |
| **Filter Popovers** | Unified `fixed left-4 right-4 rounded-3xl sm:absolute sm:rounded-2xl` pattern |
| **AppHeader** | Super-admin-only Sign Out / System Health / Platform Admin menu items |
| **WhatsApp Attribution** | "Aashikur Rahaman" linked to `https://wa.me/8801580563883` across all pages |
| **Settings Icons** | Removed `dark:` overrides that caused icon badge discoloration |

---

## 💻 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and populate your service credentials:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Build for Production
```bash
npm run build
```
