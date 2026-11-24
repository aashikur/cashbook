# Data Interfaces & API Specification: Cashbook

## 1. Top-Level Collections & TypeScript Interfaces

### 1.1 `users` (Global User Accounts)
```typescript
export type AuthProvider = 'email' | 'google';

export interface User {
  id: string;                  // Primary Key (UUID)
  email: string;               // Unique indexed email (links Email + Google OAuth)
  displayName: string;
  avatarUrl?: string;
  authProvider: AuthProvider;
  emailVerified: boolean;
  createdAt: string;           // ISO 8601 timestamp
  updatedAt: string;           // ISO 8601 timestamp
}
```

### 1.2 `organizations` (Multi-Tenant Workspaces)
```typescript
export interface Organization {
  id: string;                  // Primary Key (UUID)
  name: string;
  description?: string;
  currency: string;            // ISO 4217 code (e.g., "BDT", "USD")
  ownerId: string;             // FK -> users.id
  updatedBy?: string;          // FK -> users.id
  ownerName?: string;          // Denormalized/joined display name
  updatedByName?: string;      // Denormalized/joined display name
  createdAt: string;
  updatedAt: string;
}
```

### 1.3 `org_members` (RBAC Access Control)
```typescript
export type MemberRole = 'admin' | 'viewer';
export type InviteStatus = 'pending' | 'active' | 'revoked';

export interface OrgMember {
  id: string;                  // Composite or UUID (`${orgId}_${userId}`)
  orgId: string;               // FK -> organizations.id (Indexed)
  userId: string;              // FK -> users.id (Indexed)
  userEmail: string;           // Denormalized for fast UI member listing
  role: MemberRole;            // 'admin' = full CRUD, 'viewer' = read-only
  status: InviteStatus;
  invitedBy: string;           // FK -> users.id
  joinedAt: string;
}
```

### 1.4 `expenses` (Expense Ledgers / Categories)
```typescript
export interface Expense {
  id: string;                  // Client-generated UUID (supports offline creation)
  orgId: string;               // FK -> organizations.id (Indexed)
  title: string;               // e.g., "Utility Bills", "Vehicle Fuel"
  category?: string;           // Optional grouping tag
  totalSpent: number;          // Running aggregate (decimal/numeric in DB)
  logCount: number;            // Running count of active daily_logs
  isArchived: boolean;         // Soft-delete flag to preserve 15-year history
  createdBy: string;           // FK -> users.id
  createdByName?: string;      // Denormalized/joined display name
  updatedBy?: string;          // FK -> users.id
  updatedByName?: string;      // Denormalized/joined display name
  createdAt: string;
  updatedAt: string;
}
```

### 1.5 `daily_logs` (10–15 Year Historical Ledger Entries)
```typescript
export interface R2Attachment {
  key: string;                 // R2 key: "orgs/{orgId}/{fiscalYear}/{fiscalMonth}/{uuid}.webp"
  url: string;                 // Public CDN or signed read URL
  mimeType: string;            // e.g., "image/webp", "application/pdf"
  sizeBytes: number;
}

export interface DailyLog {
  id: string;                  // Client-generated UUID (used as Idempotency-Key)
  orgId: string;               // FK -> organizations.id (Partition/Index key)
  expenseId: string;           // FK -> expenses.id (Indexed)
  amountPaisa: number;         // Transaction amount stored strictly in integer paisa/cents
  type: 'in' | 'out';          // Cash In (+) or Cash Out (-)
  category?: string;           // Category grouping tag (e.g. "Food & Dining", "Rent")
  note: string;                // Transaction description / Remarks (optional)
  logDate: string;             // "YYYY-MM-DD" (Indexed)
  fiscalYear: number;          // e.g., 2026 (Compound Index: orgId + fiscalYear)
  fiscalMonth: number;         // 1–12 (Compound Index: orgId + fiscalYear + fiscalMonth)
  attachments: R2Attachment[]; // Cloudflare R2 references
  loggedBy: string;            // FK -> users.id
  loggedByName?: string;       // Denormalized/joined display name
  updatedBy?: string;          // FK -> users.id
  updatedByName?: string;      // Denormalized/joined display name
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;   // Soft-delete timestamp for delta sync propagation
}

### 1.5.1 `categories` (Dynamic Workspace Custom Categories)
```typescript
export interface Category {
  id: string;                  // UUID
  orgId: string;               // FK -> organizations.id
  name: string;                // Category title (e.g. "Office Equipment")
  icon?: string;               // Lucide icon identifier
  isSystem: boolean;           // Default built-in vs user-defined
  createdAt: string;
  updatedAt: string;
}
```
```

### 1.6 Client-Side Offline Models (Dexie.js / IndexedDB)
```typescript
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed';

export interface LocalExpense extends Expense {
  syncStatus: SyncStatus;
  lastSyncError?: string;
}

export interface LocalDailyLog extends DailyLog {
  syncStatus: SyncStatus;
  pendingBlobs?: {
    tempId: string;
    blob: Blob;
    mimeType: string;
    fileName: string;
  }[];
  lastSyncError?: string;
}

export interface SyncQueueItem {
  id?: number;                 // Auto-increment primary key in Dexie
  entityType: 'expense' | 'daily_log';
  entityId: string;            // UUID of the expense or daily_log
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  orgId: string;
  payload: Record<string, unknown>;
  retryCount: number;
  createdAt: string;
}
```

---

## 2. Database Indexes (10–15 Year Query Optimization)

* `org_members`: Unique index on `(orgId, userId)`; index on `(userId, status)`.
* `expenses`: Index on `(orgId, isArchived, updatedAt)`.
* `daily_logs`:
  * `(orgId, fiscalYear, fiscalMonth, logDate DESC)` — Primary monthly/yearly ledger browsing.
  * `(orgId, expenseId, logDate DESC)` — Expense-specific drill-down.
  * `(orgId, updatedAt)` — Incremental mobile delta sync (`?since=`).

---

## 3. REST API Endpoints Specification

All `/api/v1/orgs/:orgId/*` routes validate the user's session cookie/Bearer token and verify active membership in `org_members`. Mutations require `role === 'admin'`.

### 3.1 Authentication & User Profile (Better Auth)
| Method | Endpoint | Access | Request / Query Params | Response / Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | `{ email, password, displayName }` | Creates email user & returns session |
| `POST` | `/api/v1/auth/login` | Public | `{ email, password }` | Authenticates email user & sets session |
| `GET` | `/api/v1/auth/google` | Public | `?callbackUrl=/dashboard` | Redirects to Google OAuth consent screen |
| `GET` | `/api/v1/auth/google/callback` | Public | `?code=...&state=...` | Links/creates Google user & sets session |
| `POST` | `/api/v1/auth/logout` | Authenticated | — | Revokes active session |
| `POST` | `/api/v1/auth/reset-password` | Public | `{ email }` or `{ token, newPassword }` | Sends reset email or updates password |
| `GET` | `/api/v1/users/me` | Authenticated | — | Returns current `User` profile |
| `PATCH` | `/api/v1/users/me` | Authenticated | `{ displayName?, avatarUrl? }` | Updates current `User` profile |

### 3.2 Organizations
| Method | Endpoint | Access | Request / Query Params | Response / Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orgs` | Authenticated | — | Lists all `Organization` records user belongs to + their `role` |
| `POST` | `/api/v1/orgs` | Authenticated | `{ name, description?, currency }` | Creates `Organization` and assigns creator as `admin` |
| `GET` | `/api/v1/orgs/:orgId` | Admin / Viewer | — | Returns `Organization` details & current year summary |
| `PATCH` | `/api/v1/orgs/:orgId` | Admin | `{ name?, description?, currency? }` | Updates organization metadata |
| `DELETE` | `/api/v1/orgs/:orgId` | Owner (Admin) | — | Deletes organization (requires owner confirmation) |

### 3.3 Organization Members & Permissions
| Method | Endpoint | Access | Request / Query Params | Response / Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orgs/:orgId/members` | Admin / Viewer | — | Returns `OrgMember[]` list |
| `POST` | `/api/v1/orgs/:orgId/members` | Admin | `{ email, role: 'admin' \| 'viewer' }` | Grants access to existing user or creates pending invite |
| `PATCH` | `/api/v1/orgs/:orgId/members/:userId` | Admin | `{ role?, status? }` | Changes member role or revokes access |
| `DELETE` | `/api/v1/orgs/:orgId/members/:userId` | Admin | — | Removes member from organization |

### 3.4 Expenses (Ledgers)
| Method | Endpoint | Access | Request / Query Params | Response / Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orgs/:orgId/expenses` | Admin / Viewer | `?includeArchived=false` | Lists `Expense[]` with running totals |
| `POST` | `/api/v1/orgs/:orgId/expenses` | Admin | Header: `Idempotency-Key` <br> Body: `{ id, title, category? }` | Creates expense ledger (idempotent for offline sync) |
| `GET` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Admin / Viewer | — | Returns single `Expense` |
| `PATCH` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Admin | `{ title?, category?, isArchived? }` | Updates or archives expense |
| `DELETE` | `/api/v1/orgs/:orgId/expenses/:expenseId` | Admin | — | Hard-deletes expense only if `logCount === 0` |

### 3.5 Daily Logs (10–15 Year Ledger Entries)
| Method | Endpoint | Access | Request / Query Params | Response / Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orgs/:orgId/logs` | Admin / Viewer | `?year=2026&month=11&expenseId=&page=1&limit=50` | Paginated query across organization logs |
| `GET` | `/api/v1/orgs/:orgId/expenses/:expenseId/logs` | Admin / Viewer | `?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1` | Lists logs for a specific expense ledger |
| `POST` | `/api/v1/orgs/:orgId/expenses/:expenseId/logs` | Admin | Header: `Idempotency-Key` <br> Body: `{ id, amount, note, logDate, attachments[] }` | Creates log, derives `fiscalYear`/`fiscalMonth`, updates `Expense.totalSpent` atomically |
| `GET` | `/api/v1/orgs/:orgId/logs/:logId` | Admin / Viewer | — | Returns single `DailyLog` |
| `PATCH` | `/api/v1/orgs/:orgId/logs/:logId` | Admin | `{ amount?, note?, logDate?, expenseId?, attachments? }` | Updates log & recalculates `Expense.totalSpent` delta |
| `DELETE` | `/api/v1/orgs/:orgId/logs/:logId` | Admin | — | Soft-deletes log (`deletedAt`), decrements `Expense.totalSpent`, queues R2 cleanup |

### 3.6 Offline Sync, Cloudflare R2 Uploads & Reporting
| Method | Endpoint | Access | Request / Query Params | Response / Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orgs/:orgId/sync` | Admin / Viewer | `?since=2026-11-20T00:00:00Z` | Returns delta changes (`expenses[]`, `dailyLogs[]`, `serverTimestamp`) since last mobile sync |
| `POST` | `/api/v1/orgs/:orgId/uploads/presign` | Admin | `{ fileName, mimeType, sizeBytes, fiscalYear, fiscalMonth }` | Returns `{ uploadUrl, key, publicUrl }` for direct client PUT to Cloudflare R2 |
| `DELETE` | `/api/v1/orgs/:orgId/uploads` | Admin | `{ key }` | Deletes orphaned/removed receipt object from Cloudflare R2 |
| `GET` | `/api/v1/orgs/:orgId/reports/summary` | Admin / Viewer | `?year=2026` (or `?fromYear=2015&toYear=2026`) | Returns aggregated monthly & per-expense totals for charts/exports |