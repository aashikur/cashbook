# Project Scope & Architecture Specification: Cashbook

## 1. Executive Summary
**Cashbook** is a multi-tenant, offline-first personal and organizational expense ledger web application (PWA) engineered for **PC and Android** devices. It enables users to create organizations, categorize expense accounts, record daily transaction logs with receipt attachments, and delegate role-based access (`admin` vs. `viewer`). The system is architected for **10–15 years of historical data retention** with high query performance and minimal storage/egress overhead.

---

## 2. Core Functional Scope

### 2.1 Authentication & User Management
* **Dual Login Methods:** Standard Email/Password registration & login alongside one-click **Google OAuth**.
* **Account Linking:** Automatic identity unification if an email user later signs in via Google OAuth using the same email address.
* **Individual Workspaces:** Any authenticated user can create their own personal or business organizations and simultaneously participate as a member/viewer in others.

### 2.2 Organization & Role-Based Access Control (RBAC)
* **Multi-Organization Support:** Users can switch seamlessly between multiple organizations.
* **Roles:**
  * **Owner / Admin:** Full CRUD permissions on organization settings, member invites/revocations, expense ledgers, daily logs, and receipt attachments.
  * **Viewer:** Strict read-only access to organization expenses, daily logs, reports, and receipt images.

### 2.3 Expense Ledgers & Daily Logs
* **Expense Accounts (`expenses`):** Top-level ledger categories per organization (e.g., *Office Supplies*, *Site Maintenance*, *Vehicle Fuel*) with running aggregates (`totalSpent`, `logCount`) and soft-archive support (`isArchived`) to preserve historical integrity.
* **Daily Logs (`daily_logs`):** Individual financial entries tied to an expense ledger, recording `amount`, `note`, `logDate`, `fiscalYear`, `fiscalMonth`, and receipt attachments.

### 2.4 Offline-First Android & PC Experience (PWA)
* **Installable PWA:** Single codebase deployable to desktop browsers and installable on Android home screens with camera access for receipt capture.
* **Local Persistence (IndexedDB):** Active organization expenses, recent fiscal year logs, and pending offline mutations are stored locally on disk via **Dexie.js**.
* **Offline Receipt Capture & Sync Queue:** Users can create logs and attach receipt photos offline. Images are stored as binary `Blob` objects locally and uploaded automatically to Cloudflare R2 via a background sync worker upon network restoration.
* **Idempotency & Delta Sync:** Client-generated UUIDs (`Idempotency-Key`) prevent duplicate entries on unstable mobile networks; incremental delta sync (`?since=timestamp`) minimizes mobile data usage.

### 2.5 10–15 Year Data Longevity & Media Storage
* **Partitioned Querying:** All `daily_logs` include indexed `fiscalYear` and `fiscalMonth` fields alongside `orgId` to guarantee sub-100ms queries across 15 years of data.
* **Zero-Egress Receipt Storage:** Receipt images/PDFs are compressed client-side (`.webp`) and uploaded directly to **Cloudflare R2** using short-lived presigned URLs, eliminating egress fees over a 15-year lifecycle.

---

## 3. Recommended Tech Stack & Rationale

| Layer | Technology | Rationale for 10–15 Year Scale |
| :--- | :--- | :--- |
| **Frontend & PWA** | **Next.js (App Router) + React + TypeScript + Tailwind CSS** | Unified codebase for PC & Android; native Service Worker (Workbox) support for offline app shell caching. |
| **Offline Database** | **Dexie.js (IndexedDB)** | Disk-backed local database supporting hundreds of MBs, compound indexes, ACID transactions, and raw binary `Blob` storage for offline receipt photos. |
| **UI State** | **Zustand** | Lightweight in-memory state for active organization context, modal states, and filter controls. |
| **Backend API** | **Next.js Route Handlers (or Hono/Node.js)** | End-to-end TypeScript type safety; handles RBAC enforcement, PostgreSQL queries, and R2 presigned URL generation. |
| **Primary Database** | **PostgreSQL** (Neon / Supabase / Self-hosted) | ACID compliance for financial records, native partitioning/indexing on `(orgId, fiscalYear, fiscalMonth)`, and zero vendor lock-in. |
| **ORM / Query Builder** | **Drizzle ORM** | Lightweight, zero-overhead SQL-like TypeScript queries ideal for complex financial aggregations and migrations. |
| **Authentication** | **Better Auth** | Open-source, self-hosted auth stored in PostgreSQL; avoids per-MAU SaaS pricing over 15 years; natively supports Email/Password, Google OAuth, and Organization RBAC. |
| **Object Storage** | **Cloudflare R2** | S3-compatible API with **$0 egress fees**, making 15 years of receipt image viewing virtually free. |
| **Transactional Email** | **Resend** | Reliable API for email verification, password resets, and organization viewer invitations. |

---

## 4. Non-Functional Requirements & Architectural Guardrails

* **Financial Precision Rule**: Monetary figures are stored and processed strictly as integer minor units (`amountPaisa`, `totalSpent`) to permanently eliminate floating-point drift over 10–15 years.
* **Strict Multi-Tenant Isolation**: Every database query and R2 storage key (`orgs/{orgId}/{fiscalYear}/{fiscalMonth}/{uuid}.webp`) must be scoped by `orgId` and verified through `requireOrgMember(orgId, role?)`.
* **Preserved Financial History**: Ledgers with `logCount > 0` must never be hard-deleted. Soft-archive (`isArchived: true`) and soft-delete tombstones (`deletedAt: timestamp`) are mandatory to ensure historical balance integrity.
* **Local-First / 0ms UX**: UI components must leverage Dexie IndexedDB cache (`localDb`) for instant 0ms rendering and use background SWR / Delta sync (`/sync?since=`) for server freshness.
* **Client-Side Image Compression**: Mobile and PC clients compress receipt photos to WebP (`maxWidth: 1600px`, `quality: 0.8`) before storing as Blobs in IndexedDB or uploading to Cloudflare R2 ($0 egress fees).
* **Mobile Touch Standard**: All interactive touch targets must meet the 48x48 physical pixel standard via CSS pseudo-element hit-slop (`before:-inset-2`) while keeping desktop visual density crisp.
* **Continuous Documentation Synchronization**: Zero-prompt synchronization of API contracts, Postman collections, architecture notes, and interview guides on every code modification.
