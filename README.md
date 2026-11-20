# CashBook (Modern Offline-First Ledger & Expense Tracker)

A clean, modern, offline-first multi-tenant financial ledger PWA built with **Next.js 15 (App Router)**, **React 19**, **Better Auth**, **Drizzle ORM**, and **Dexie.js (IndexedDB)**. Architected for 10–15 years of scale with integer minor unit financial precision and Cloudflare R2 presigned receipt uploads.

![Clean Fintech UI Reference](docs/notes/README.md)

---

## 🚀 Key Features

- **Clean Fintech UI Aesthetic:** High-contrast, mobile-first design matching modern fintech interfaces.
- **Dynamic Theming via Global CSS Variables:** All colors, surfaces, borders, and brand accents are centralized in `globals.css` with zero hardcoded color classes.
- **Zero Raw Emojis:** Strictly modern SVG icons from `lucide-react`.
- **Haptic Tactile Feedback:** Universal click micro-compression (`scale(0.965)`) and tap highlight optimizations across all buttons and cards.
- **Offline-First Persistence:** Reactive Dexie.js (IndexedDB) client storage with background delta synchronization.
- **Multi-Tenant RBAC:** Isolated organization workspaces with role-based access control (Admin vs. Viewer).
- **15-Year Financial Longevity:** Integer paisa/cent precision (`amountPaisa: integer`) eliminates floating-point drift.
- **Direct Receipt Uploads:** Cloudflare R2 presigned S3 URLs with client-side WebP image compression ($0 egress fees).

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 15.3.3](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **Library:** React 19
- **Database ORM:** [Drizzle ORM](https://orm.drizzle.team/) + PostgreSQL ([Neon Serverless](https://neon.tech))
- **Authentication:** [Better Auth](https://www.better-auth.com/) (Self-hosted, Google OAuth & Email)
- **Client Database:** [Dexie.js](https://dexie.org/) (IndexedDB wrapper) + `dexie-react-hooks`
- **Global State:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Styling:** Tailwind CSS v4 with custom `@theme` CSS custom properties
- **Icons:** [Lucide React](https://lucide.dev/)
- **Object Storage:** Cloudflare R2 via `@aws-sdk/client-s3`

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
