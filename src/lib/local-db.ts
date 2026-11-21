/**
 * Dexie.js (IndexedDB) — Offline-first local database.
 * Docs ref: §1.6 Client-Side Offline Models, §2.4 Offline-First
 *
 * Caches:
 *  - Active org's expenses
 *  - Current fiscal year + previous 3 months of daily_logs
 *  - Pending mutations queue (sync_queue)
 */
import Dexie, { type EntityTable } from "dexie";

// ─── Local model types ─────────────────────────────────────────────────────────

export type SyncStatus = "synced" | "pending" | "syncing" | "failed";

export type LocalExpense = {
  id: string;
  orgId: string;
  title: string;
  category?: string;
  totalSpent: number; // in paisa (integer)
  logCount: number;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  lastSyncError?: string;
};

export type PendingBlob = {
  tempId: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
};

export type LocalDailyLog = {
  id: string;
  orgId: string;
  expenseId: string;
  type: "in" | "out";
  category: string;
  amountPaisa: number;
  note: string;
  logDate: string; // YYYY-MM-DD
  fiscalYear: number;
  fiscalMonth: number;
  attachments: Array<{
    key: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  loggedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncStatus: SyncStatus;
  pendingBlobs?: PendingBlob[];
  lastSyncError?: string;
};

export type SyncQueueItem = {
  id?: number; // auto-increment PK
  entityType: "expense" | "daily_log";
  entityId: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  orgId: string;
  payload: Record<string, unknown>;
  retryCount: number;
  createdAt: string;
};

export type LocalCategory = {
  id: string;
  orgId: string;
  name: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Dexie DB definition ───────────────────────────────────────────────────────

class CashbookDatabase extends Dexie {
  expenses!: EntityTable<LocalExpense, "id">;
  dailyLogs!: EntityTable<LocalDailyLog, "id">;
  categories!: EntityTable<LocalCategory, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;

  constructor() {
    super("cashbook_v2");

    this.version(1).stores({
      expenses: "id, orgId, [orgId+isArchived], updatedAt",
      dailyLogs:
        "id, orgId, expenseId, logDate, [orgId+fiscalYear+fiscalMonth], [orgId+expenseId+logDate], [orgId+updatedAt], syncStatus",
      syncQueue: "++id, entityType, entityId, orgId, createdAt",
    });

    this.version(2).stores({
      expenses: "id, orgId, [orgId+isArchived], updatedAt",
      dailyLogs:
        "id, orgId, expenseId, type, category, logDate, [orgId+fiscalYear+fiscalMonth], [orgId+expenseId+logDate], [orgId+updatedAt], syncStatus",
      syncQueue: "++id, entityType, entityId, orgId, createdAt",
    });

    this.version(3).stores({
      expenses: "id, orgId, [orgId+isArchived], updatedAt",
      dailyLogs:
        "id, orgId, expenseId, type, category, logDate, [orgId+fiscalYear+fiscalMonth], [orgId+expenseId+logDate], [orgId+updatedAt], syncStatus",
      categories: "id, orgId, name, updatedAt",
      syncQueue: "++id, entityType, entityId, orgId, createdAt",
    });
  }
}

export const localDb = new CashbookDatabase();
