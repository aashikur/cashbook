# 04 - REST API & Multi-Tenant RBAC Architecture

This module details how all API endpoints are structured, authenticated, and guarded with strict tenant isolation.

---

## 1. Tenant Isolation & Security Rules

Docs ref: §4 Non-Functional Requirements & Guardrails:
> *"Strict Tenant Isolation: Every database query ... must be scoped and validated against orgId and active org_members permissions."*

In `src/lib/auth-helpers.ts`:
- `getSessionContext()` extracts the validated user session from Better Auth.
- `requireOrgMember(orgId, role?)` queries `org_members` to ensure:
  1. The user belongs to `orgId`.
  2. The membership status is `"active"` (not pending or revoked).
  3. If `role === "admin"` is required, viewers are rejected with HTTP 403 Forbidden.

---

## 2. API Endpoints Map

### Organizations (`/api/v1/orgs`)
| Method | Endpoint | RBAC | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orgs` | Auth | Lists all organizations user belongs to with their role |
| `POST` | `/api/v1/orgs` | Auth | Creates organization & assigns creator as admin in `org_members` |
| `GET` | `/api/v1/orgs/:orgId` | Viewer | Returns organization info & current year live totals |
| `PATCH` | `/api/v1/orgs/:orgId` | Admin | Updates name, description, currency |
| `DELETE` | `/api/v1/orgs/:orgId` | Owner | Deletes organization (owner verification required) |

### Expenses Ledgers (`/api/v1/orgs/:orgId/expenses`)
| Method | Endpoint | RBAC | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orgs/:orgId/expenses` | Viewer | Lists ledgers (`?includeArchived=false`) |
| `POST` | `/api/v1/orgs/:orgId/expenses` | Admin | Idempotent ledger creation via `Idempotency-Key` |
| `GET` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Viewer | Returns single ledger category |
| `PATCH` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Admin | Soft-archives (`isArchived`) or renames |
| `DELETE` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Admin | Allowed **only if `logCount === 0`** to protect 15-year history |

### Daily Logs (`/api/v1/orgs/:orgId/logs` & expenses logs)
| Method | Endpoint | RBAC | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orgs/:orgId/logs` | Viewer | Paginated query partitioned by `year`, `month`, `date`, `expenseId` |
| `POST` | `/api/v1/orgs/:orgId/expenses/:expenseId/logs` | Admin | Creates entry, derives `fiscalYear`/`fiscalMonth`, increments parent totals atomically |
| `PATCH` | `/api/v1/orgs/:orgId/logs/:logId` | Admin | Updates entry & recalculates running delta on parent `Expense` |
| `DELETE` | `/api/v1/orgs/:orgId/logs/:logId` | Admin | Soft-deletes (`deletedAt`) & decrements `Expense.totalSpent` |

### Sync, Presigned Uploads & Reporting
| Method | Endpoint | RBAC | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orgs/:orgId/sync` | Viewer | Cold (`!since`) or Delta sync (`?since=timestamp`) returning modified records and tombstones |
| `POST` | `/api/v1/orgs/:orgId/uploads/presign` | Admin | Generates Cloudflare R2 presigned PUT URL |
| `GET` | `/api/v1/orgs/:orgId/reports/summary` | Viewer | Monthly & expense breakdown for charts and exports |

---

## 3. RBAC Permission Matrix & Client-Side Lockout

| Permission / Action | Admin / Editor | Viewer | UI Enforcement Mechanism |
| :--- | :---: | :---: | :--- |
| **View Dashboard, Ledgers & Logs** | ✅ | ✅ | Open to all active organization members |
| **Create New Ledger Book** | ✅ | ❌ | `+ Add New Book` button hidden for Viewers |
| **Quick Cash In / Out (+/-)** | ✅ | ❌ | Quick action buttons hidden on `BookCard` |
| **Edit / Archive Ledger** | ✅ | ❌ | Edit & Archive options removed from dropdown menu |
| **Delete Empty Ledger** | ✅ | ❌ | Delete option hidden; API enforces `logCount === 0` |
| **Add / Edit / Delete Transactions** | ✅ | ❌ | `+ Cash In` and `- Cash Out` CTAs hidden; edit/delete icons removed |
| **Invite & Manage Members** | ✅ | ❌ | Member invitation input & role toggles disabled |
