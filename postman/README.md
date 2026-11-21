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
| **Auth** | `GET` | `/api/auth/get-session` | Authenticated | Retrieves current user session |
| **Auth** | `POST` | `/api/auth/sign-in/email` | Public | Sign in with email and password |
| **Auth** | `POST` | `/api/auth/sign-up/email` | Public | Create new account |
| **Auth** | `POST` | `/api/auth/sign-out` | Authenticated | Invalidate session cookie |
| **Organizations** | `GET` | `/api/v1/orgs` | Member | List accessible organizations |
| **Organizations** | `POST` | `/api/v1/orgs` | Authenticated | Create a new organization |
| **Organizations** | `GET` | `/api/v1/orgs/:orgId` | Member | Get active organization metadata |
| **Members** | `GET` | `/api/v1/orgs/:orgId/members` | Member | List organization members |
| **Members** | `POST` | `/api/v1/orgs/:orgId/members/invite` | Admin | Invite a user via email |
| **Ledgers** | `GET` | `/api/v1/orgs/:orgId/expenses` | Member | List all ledger books |
| **Ledgers** | `POST` | `/api/v1/orgs/:orgId/expenses` | Admin | Create ledger book |
| **Ledgers** | `GET` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Member | Get ledger book details |
| **Ledgers** | `PATCH` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Admin | Update / Archive ledger book |
| **Ledgers** | `DELETE` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Admin | Delete book (only if logCount === 0) |
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
- **Amounts in Paisa:** Stored strictly as positive integer cents/paisa (`amountPaisa`).
- **Audit Preserved:** Ledgers with `logCount > 0` cannot be hard deleted.
