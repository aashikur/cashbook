/**
 * Offline Sync Service & Background Queue Worker
 * Docs ref: §2.4 Offline Receipt Capture & Sync Queue, §1.6 Dexie Models
 *
 * Responsibilities:
 *  1. Enqueues offline mutations (expenses, logs with binary receipt photo Blobs).
 *  2. Uploads photos directly to Cloudflare R2 via presigned URLs when online.
 *  3. Flushes mutations to server with Idempotency-Key headers.
 *  4. Performs incremental delta sync (?since=timestamp) to update local Dexie cache.
 */

import { localDb, SyncQueueItem } from "./local-db";

const SYNC_TIMESTAMP_KEY = "cashbook_last_sync_timestamp";

export function getLastSyncTimestamp(orgId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${SYNC_TIMESTAMP_KEY}_${orgId}`);
}

export function setLastSyncTimestamp(orgId: string, timestamp: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${SYNC_TIMESTAMP_KEY}_${orgId}`, timestamp);
}

/**
 * Enqueues a mutation in Dexie syncQueue for background flushing
 */
export async function enqueueSyncItem(
  item: Omit<SyncQueueItem, "id" | "createdAt" | "retryCount">
): Promise<number | undefined> {
  return await localDb.syncQueue.add({
    ...item,
    retryCount: 0,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Flushes pending mutations in the local Dexie queue to the backend server
 */
export async function processSyncQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { processed: 0, failed: 0 };
  }

  const items = await localDb.syncQueue.orderBy("id").toArray();
  let processed = 0;
  let failed = 0;

  for (const item of items) {
    if (!item.id) continue;

    try {
      if (item.entityType === "expense" && item.operation === "CREATE") {
        const res = await fetch(`/api/v1/orgs/${item.orgId}/expenses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": item.entityId,
          },
          body: JSON.stringify(item.payload),
        });

        if (res.ok) {
          await localDb.expenses.update(item.entityId, { syncStatus: "synced" });
          await localDb.syncQueue.delete(item.id);
          processed++;
        } else {
          failed++;
        }
      } else if (item.entityType === "daily_log" && item.operation === "CREATE") {
        const localLog = await localDb.dailyLogs.get(item.entityId);
        const payload: {
          expenseId?: string;
          attachments?: Array<{
            key: string;
            url: string;
            mimeType: string;
            sizeBytes: number;
          }>;
          [key: string]: unknown;
        } = { ...item.payload };

        // 1. If there are pending receipt photo blobs, upload directly to R2 first
        if (localLog?.pendingBlobs && localLog.pendingBlobs.length > 0) {
          const uploadedAttachments = [...(payload.attachments || [])];

          for (const pending of localLog.pendingBlobs) {
            // Request presigned URL from server
            const presignRes = await fetch(
              `/api/v1/orgs/${item.orgId}/uploads/presign`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fileName: pending.fileName,
                  mimeType: pending.mimeType,
                  sizeBytes: pending.blob.size,
                  fiscalYear: localLog.fiscalYear,
                  fiscalMonth: localLog.fiscalMonth,
                }),
              }
            );

            if (presignRes.ok) {
              const { data: presignData } = await presignRes.json();
              // Direct client PUT to Cloudflare R2
              const r2Res = await fetch(presignData.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": pending.mimeType },
                body: pending.blob,
              });

              if (r2Res.ok) {
                uploadedAttachments.push({
                  key: presignData.key,
                  url: presignData.publicUrl,
                  mimeType: pending.mimeType,
                  sizeBytes: pending.blob.size,
                });
              }
            }
          }
          payload.attachments = uploadedAttachments;
        }

        // 2. Submit log to server route handler
        const expenseId = payload.expenseId || localLog?.expenseId;
        const res = await fetch(
          `/api/v1/orgs/${item.orgId}/expenses/${expenseId}/logs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": item.entityId,
            },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          await localDb.dailyLogs.update(item.entityId, {
            syncStatus: "synced",
            pendingBlobs: [],
            attachments: payload.attachments,
          });
          await localDb.syncQueue.delete(item.id);
          processed++;
        } else {
          failed++;
        }
      } else if (item.entityType === "daily_log" && item.operation === "UPDATE") {
        const res = await fetch(`/api/v1/orgs/${item.orgId}/logs/${item.entityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });

        if (res.ok) {
          await localDb.dailyLogs.update(item.entityId, { syncStatus: "synced" });
          await localDb.syncQueue.delete(item.id);
          processed++;
        } else {
          failed++;
        }
      } else if (item.entityType === "daily_log" && item.operation === "DELETE") {
        const res = await fetch(`/api/v1/orgs/${item.orgId}/logs/${item.entityId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          await localDb.syncQueue.delete(item.id);
          processed++;
        } else {
          failed++;
        }
      } else if (item.entityType === "expense" && item.operation === "UPDATE") {
        const res = await fetch(`/api/v1/orgs/${item.orgId}/expenses/${item.entityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });

        if (res.ok) {
          await localDb.expenses.update(item.entityId, { syncStatus: "synced" });
          await localDb.syncQueue.delete(item.id);
          processed++;
        } else {
          failed++;
        }
      } else if (item.entityType === "expense" && item.operation === "DELETE") {
        const res = await fetch(`/api/v1/orgs/${item.orgId}/expenses/${item.entityId}`, {
          method: "DELETE",
        });

        // 200 OK or 404 Not Found (already deleted on server) are both successful syncs
        if (res.ok || res.status === 404) {
          await localDb.syncQueue.delete(item.id);
          processed++;
        } else {
          failed++;
        }
      }
    } catch (err) {
      console.error(`Sync queue item ${item.id} error:`, err);
      await localDb.syncQueue.update(item.id, {
        retryCount: item.retryCount + 1,
      });
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Performs incremental delta sync (?since=timestamp) from server
 */
export async function performDeltaSync(orgId: string): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;

  const since = getLastSyncTimestamp(orgId);
  const url = since
    ? `/api/v1/orgs/${orgId}/sync?since=${encodeURIComponent(since)}`
    : `/api/v1/orgs/${orgId}/sync`;

  try {
    const res = await fetch(url);
    if (!res.ok) return;

    const { data } = await res.json();
    const { expenses: remoteExpenses, dailyLogs: remoteLogs, serverTimestamp } = data;

    // Upsert or remove remote expenses into Dexie
    if (remoteExpenses && remoteExpenses.length > 0) {
      await localDb.transaction("rw", [localDb.expenses, localDb.dailyLogs], async () => {
        for (const exp of remoteExpenses) {
          if (exp.deletedAt) {
            // Tombstone received: remove deleted book & its logs from local cache
            await localDb.expenses.delete(exp.id);
            await localDb.dailyLogs.where("expenseId").equals(exp.id).delete();
          } else {
            await localDb.expenses.put({
              ...exp,
              totalSpent: parseInt(exp.totalSpent, 10) || 0,
              syncStatus: "synced",
            });
          }
        }
      });
    }

    // Upsert or remove remote logs into Dexie
    if (remoteLogs && remoteLogs.length > 0) {
      await localDb.transaction("rw", localDb.dailyLogs, async () => {
        for (const log of remoteLogs) {
          if (log.deletedAt) {
            // Remove soft-deleted item from local cache
            await localDb.dailyLogs.delete(log.id);
          } else {
            await localDb.dailyLogs.put({
              ...log,
              syncStatus: "synced",
            });
          }
        }
      });
    }

    setLastSyncTimestamp(orgId, serverTimestamp);
  } catch (err) {
    console.error("Delta sync error:", err);
  }
}

// Automatically register online sync listener in browser
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    processSyncQueue();
  });
}
