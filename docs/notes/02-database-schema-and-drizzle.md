# 02 - Database Schema & 15-Year Financial Longevity

## 1. The Financial Precision Principle (No Floats!)

In financial ledgers, **never store currency as floating-point numbers (`float`, `real`, or JavaScript `number`)**.
* `0.1 + 0.2` in JavaScript produces `0.30000000000000004`. Over 10–15 years and tens of thousands of transactions, fractional pennies drift and corrupt balances.
* **Our Solution**: All monetary values are represented as **integer minor units** (e.g. BDT Paisa or US Cents).
  * ৳1,250.50 is stored as `125050` (`amountPaisa: integer`).
  * In the UI, `formatCurrency(amountPaisa / 100)` formats it safely back to decimal with currency symbol (`৳1,250.50`).

---

## 2. 10–15 Year High-Performance Partitioning

To ensure that querying 15 years of transaction history remains under 100ms:
* Every `daily_logs` record includes derived fields:
  * `fiscalYear`: e.g. `2026`
  * `fiscalMonth`: `1–12`
  * `logDate`: `"2026-11-21"`
* **Compound Indexes**:
  * `(orgId, fiscalYear, fiscalMonth, logDate DESC)` — Primary monthly ledger query.
  * `(orgId, expenseId, logDate DESC)` — Drill-down per category.
  * `(orgId, updatedAt)` — Incremental mobile delta sync (`?since=`).
  * `(orgId, deletedAt)` (`expenses_org_deleted_idx`) — High-performance cold sync filtering and soft-delete tombstone tracking.

---

## 3. Soft-Delete Tombstones (Preserving Financial Auditability)

In distributed offline-first systems, **hard deleting records (`DELETE FROM ...`) is catastrophic**:
- If a server hard-deletes a book or entry, offline clients never receive the deletion event during delta sync. The deleted item remains cached on the client device forever ("phantom books").
- Attempting to delete a phantom book from the client produces 404/400 errors because the record no longer exists on the server.
- **Production Solution**: Both `expenses` and `daily_logs` use `deletedAt: timestamp("deleted_at")`.
  - When deleted, `deletedAt = new Date()` and `updatedAt = new Date()`.
  - Cold sync queries (`!since`) filter `isNull(deletedAt)` for instant payload savings.
  - Delta sync queries (`?since=timestamp`) return the soft-deleted records as **tombstones**, instructing the client's Dexie database to purge the record and its sub-entries cleanly.
  - Books with `logCount > 0` are protected from deletion; they can only be soft-archived (`isArchived: true`) to preserve historical balance integrity.

---

## 4. Schema Tables Overview

```
users (Better Auth)
  └── organizations (Multi-tenant workspaces)
        ├── org_members (RBAC: admin vs viewer)
        ├── expenses (Ledger categories with running totalSpent & logCount)
        └── daily_logs (Historical entries with R2 receipt attachment jsonb)
```

### Running Drizzle Migrations

When editing `src/db/schema/*`:

```bash
# 1. Generate SQL migration files in src/db/migrations
npm run db:generate

# 2. Push schema directly to Neon DB during development
npm run db:push

# 3. Open interactive Drizzle Studio UI in browser
npm run db:studio
```
