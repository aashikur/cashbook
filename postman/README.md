# 📮 CashBook API Postman Collection

This directory contains the official Postman v2.1.0 collection for **CashBook**.

---

## 🚀 How to Import into Postman Desktop / Web

1. Open **Postman**.
2. Select your workspace (e.g. `Aashikur Rahaman's Workspace`).
3. Click the **"Import"** button in the top-left corner of the sidebar or press `Ctrl + O`.
4. Choose **File** and select:
   ```
   postman/cashbook.postman_collection.json
   ```
5. Click **Import**. The **CashBook API Collection** will now appear in your Collections tab.

---

## ⚙️ Environment Variables Configured

The collection comes pre-configured with the following variables:
- `baseUrl`: `http://localhost:3000`
- `orgId`: Active Organization UUID
- `expenseId`: Ledger Book UUID
- `logId`: Transaction Log UUID
- `userId`: User Profile UUID

---

## 📋 Endpoint Overview

| Module | Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/health` | Public | Server & Neon DB health check |
| **Super Admin** | `GET` | `/api/v1/admin/overview` | Super Admin | Platform telemetry, metrics, users directory & org mapping |
| **Auth** | `GET` | `/api/auth/get-session` | Authenticated | Retrieves current user session |
| **Auth** | `POST` | `/api/auth/sign-in/email` | Public | Sign in with email and password |
| **Auth** | `POST` | `/api/auth/sign-up/email` | Public | Create new account |
| **Auth** | `POST` | `/api/auth/sign-out` | Authenticated | Invalidate session cookie |
| **Organizations** | `GET` | `/api/v1/orgs` | Member | List accessible organizations |
| **Organizations** | `POST` | `/api/v1/orgs` | Authenticated | Create a new organization |
| **Organizations** | `GET` | `/api/v1/orgs/:orgId` | Member | Get active organization metadata |
| **Members** | `GET` | `/api/v1/orgs/:orgId/members` | Member | List organization members |
| **Members** | `POST` | `/api/v1/orgs/:orgId/members` | Admin | Invite a user via email (creates pending invite) |
| **Members** | `PATCH` | `/api/v1/orgs/:orgId/members/:userId` | Admin | Update member role (`admin` vs `viewer`) |
| **Members** | `DELETE` | `/api/v1/orgs/:orgId/members/:userId` | Admin | Remove member from organization |
| **Invitations** | `GET` | `/api/v1/invitations` | Authenticated | List all pending invitations for user |
| **Invitations** | `POST` | `/api/v1/invitations/:inviteId/accept` | Authenticated | Accept invitation and activate membership |
| **Invitations** | `POST` | `/api/v1/invitations/:inviteId/decline` | Authenticated | Decline / revoke pending invitation |
| **Ledgers** | `GET` | `/api/v1/orgs/:orgId/expenses` | Member | List all ledger books |
| **Ledgers** | `POST` | `/api/v1/orgs/:orgId/expenses` | Admin | Create ledger book |
| **Ledgers** | `GET` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Member | Get ledger book details |
| **Ledgers** | `PATCH` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Admin | Update / Archive ledger book |
| **Ledgers** | `DELETE` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Admin | Soft-delete book tombstone (only if logCount === 0; idempotent) |
| **Logs** | `GET` | `/api/v1/orgs/:orgId/expenses/:expenseId/logs` | Member | List transaction logs in ledger |
| **Logs** | `GET` | `/api/v1/orgs/:orgId/logs?year=&month=&category=` | Member | Query logs across books |
| **Logs** | `POST` | `/api/v1/orgs/:orgId/expenses/:expenseId/logs` | Member | Create transaction (`type`, `category`) |
| **Logs** | `GET` | `/api/v1/orgs/:orgId/logs/:logId` | Member | Get single log with expense |
| **Logs** | `PATCH` | `/api/v1/orgs/:orgId/logs/:logId` | Admin | Edit log (`amountPaisa`, `category`, `type`) |
| **Logs** | `DELETE` | `/api/v1/orgs/:orgId/logs/:logId` | Admin | Soft-delete transaction log |
| **Uploads** | `POST` | `/api/v1/orgs/:orgId/uploads/presign` | Member | Get Cloudflare R2 presigned PUT URL |
| **Uploads** | `POST` | `/api/v1/orgs/:orgId/uploads` | Member | Direct server-streamed upload fallback |
| **Categories** | `GET` | `/api/v1/orgs/:orgId/categories` | Member | List custom categories for workspace |
| **Categories** | `POST` | `/api/v1/orgs/:orgId/categories` | Member | Create custom category |
| **Categories** | `PATCH` | `/api/v1/orgs/:orgId/categories/:id` | Admin | Rename category & auto-update logs |
| **Categories** | `DELETE` | `/api/v1/orgs/:orgId/categories/:id` | Admin | Delete category & move logs to General |
| **Sync** | `GET` | `/api/v1/orgs/:orgId/sync?since=` | Member | Delta sync for offline Dexie |
| **Reports** | `GET` | `/api/v1/orgs/:orgId/reports/summary?fiscalYear=` | Member | Monthly aggregated P&L breakdown |

---

## 🔒 Security & Data Integrity Rules
- **Multi-Tenant Isolation:** `orgId` checked on every query.
- **Audit Trails & Attribution:** All mutations track `createdBy` / `loggedBy` and `updatedBy` along with ISO timestamps. Responses include joined `createdByName` / `loggedByName` and `updatedByName`.
- **Amounts in Paisa:** Stored strictly as positive integer cents/paisa (`amountPaisa`).
- **Audit Preserved:** Ledgers with `logCount > 0` cannot be hard deleted.

---

## 📝 Session Changelog

### v1.1 — UI Refactor (2026-11-28)
> No new API routes were added or modified. This was a **UI-only refactor session**.

| Area | Change |
| :--- | :--- |
| **PWA Service Worker** | Bumped to `cashbook-pwa-v2`; dev-only auto-unregister + cache purge added |
| **Dashboard** | Focus-search mode, edge-to-edge `px-0` layout, `BookActionsMenu` ⋮ shared component |
| **BookActionsMenu** | New `src/components/dashboard/BookActionsMenu.tsx` — reused on Dashboard + Entry Books |
| **BookDetailsModal** | Flat borderless design, `w-11 h-11` close button, no box-in-box styling |
| **Filter Popovers** | Unified `fixed left-4 right-4 rounded-3xl sm:absolute` pattern across all 4 filters |
| **AppHeader** | Super-admin-only conditional menu (Sign Out / System Health / Platform Admin) |
| **WhatsApp** | Attribution link `https://wa.me/8801580563883` added across sign-in, sign-up, settings, health pages |
| **Cleanup** | Removed `docs/postman/` duplicate dir, `scripts/migrate-neon.js`, `public/favicon.ico` conflict |

All existing endpoint contracts (URL, method, request schema, response shape) remain unchanged.
