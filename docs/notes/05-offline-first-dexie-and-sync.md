# 05 - Offline-First Engine: Dexie.js & Background Sync

This module explains the offline storage engine, client-side photo blobs, and background synchronization.

---

## 1. Why Dexie.js (IndexedDB) Over LocalStorage?

1. **Storage Limits**: LocalStorage is strictly capped at ~5MB per domain. Dexie (IndexedDB) can store **hundreds of megabytes**, sufficient to cache years of financial ledgers.
2. **Binary Data (Receipt Photos)**: Dexie natively stores raw binary `Blob` objects. An offline mobile user can photograph receipts with their camera; photos are compressed to WebP and stored directly as Blobs in IndexedDB.
3. **Compound Indexes**: Allows sub-millisecond queries on client devices:
   ```ts
   dailyLogs: "id, orgId, expenseId, logDate, [orgId+fiscalYear+fiscalMonth], [orgId+expenseId+logDate]"
   ```

---

## 2. The Offline Sync Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Mobile / PC User
    participant App as CashBook Client (PWA)
    participant Dexie as Dexie.js (IndexedDB)
    participant R2 as Cloudflare R2 ($0 Egress)
    participant Server as Next.js API Routes

    User->>App: Creates Expense or Daily Log (Offline)
    App->>App: Compresses receipt photo to WebP Blob (Canvas)
    App->>Dexie: Writes to local dailyLogs (syncStatus: 'pending')
    App->>Dexie: Enqueues task in syncQueue
    Note over App,Dexie: User sees entry immediately in UI!

    User->>App: Device comes online (window.online event)
    App->>Server: POST /api/v1/orgs/:orgId/uploads/presign
    Server-->>App: Returns presigned R2 PUT URL
    App->>R2: Direct HTTP PUT receipt WebP Blob
    App->>Server: POST /api/v1/orgs/:orgId/expenses/:expenseId/logs (with Idempotency-Key)
    Server-->>App: 201 Created & DB persisted
    App->>Dexie: Updates syncStatus to 'synced' & clears syncQueue item
```

---

## 3. Idempotency & Delta Sync

- **Client-Generated UUIDs**: Every log and expense generates a `crypto.randomUUID()` before creation. Passed as an `Idempotency-Key` HTTP header. If mobile network drops during upload and retries, PostgreSQL's `onConflictDoNothing` prevents duplicate double-spending records.
- **Delta Sync (`?since=`) & Tombstones**: The client downloads records where `updatedAt > lastSyncTimestamp`. Both `expenses` and `daily_logs` employ soft-delete tombstones (`deletedAt`). When `performDeltaSync()` encounters a record with `deletedAt`, it immediately purges the item and associated sub-records from local Dexie IndexedDB cache, preventing phantom books and orphaned records.

---

## 4. Progressive Web App (PWA) Service Worker & App Shell

To ensure mobile devices without an internet connection can boot into the app immediately rather than encountering browser connection errors:

- **Service Worker (`public/sw.js`)**:
  - Pre-caches core application shell (`/dashboard`, `/`, `/manifest.json`, app icons).
  - Employs **Network-First with Cache Fallback** for navigational requests: if offline, the cached app shell HTML is served immediately.
  - Employs **Cache-First** for immutable Next.js static assets (`/_next/static/*`), guaranteeing instantaneous UI rendering.
  - Bypasses `/api/*` endpoints so that Dexie.js (`localDb`) and `syncQueue` serve as the singular local-first source of truth for all business data.
- **Client Lifecycle Registration (`src/components/pwa/ServiceWorkerRegister.tsx`)**:
  - Automatically registers the Service Worker on window load in `src/app/layout.tsx`.
- **Full Offline Mutation Support (`CREATE`, `UPDATE`, `DELETE`)**:
  - Offline mutations across books and logs (create, edit note/amount/date, delete log) optimistically mutate Dexie IndexedDB and enqueue into `localDb.syncQueue`.
  - When connection is restored (`window.online`), `processSyncQueue()` flushes pending tasks to the server.

