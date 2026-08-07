import * as SQLite from "expo-sqlite";
import NetInfo from "@react-native-community/netinfo";
import { api } from "./client";
import { OFFLINE_QUEUE } from "../constants/config";

// ─── DB init ──────────────────────────────────────────────────────────────────

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync("lockedin_queue.db");
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        body TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        next_retry_at INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);
    // Migration: add columns if they don't exist (idempotent)
    try {
      await db.execAsync(
        "ALTER TABLE offline_queue ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0",
      );
    } catch {
      // column already exists — fine
    }
    try {
      await db.execAsync(
        "ALTER TABLE offline_queue ADD COLUMN next_retry_at INTEGER NOT NULL DEFAULT 0",
      );
    } catch {
      // column already exists — fine
    }
  }
  return db;
}

// ─── Retry schedule ───────────────────────────────────────────────────────────
// 0 retries → immediate, 1 → 30s, 2 → 2min, 3 → 10min, 4+ → 30min cap
const RETRY_DELAYS_MS = [0, 30_000, 120_000, 600_000, 1_800_000];

function nextRetryMs(retryCount: number): number {
  const delayIdx = Math.min(retryCount, RETRY_DELAYS_MS.length - 1);
  return Date.now() + RETRY_DELAYS_MS[delayIdx];
}

// ─── Enqueue a write ──────────────────────────────────────────────────────────

export async function enqueueWrite(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<void> {
  const database = await getDb();
  const now = Date.now();

  // Enforce max queue size — drop oldest to make room
  const { count } = (await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM offline_queue",
  )) ?? { count: 0 };

  if (count >= OFFLINE_QUEUE.maxSize) {
    await database.runAsync(
      "DELETE FROM offline_queue WHERE id = (SELECT id FROM offline_queue ORDER BY created_at ASC LIMIT 1)",
    );
  }

  await database.runAsync(
    "INSERT INTO offline_queue (method, path, body, retry_count, next_retry_at, created_at) VALUES (?, ?, ?, 0, 0, ?)",
    [method, path, body ? JSON.stringify(body) : null, now],
  );
}

// ─── Get pending queue count (for UI badge) ───────────────────────────────────

export async function getPendingCount(): Promise<number> {
  try {
    const database = await getDb();
    const { count } = (await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM offline_queue",
    )) ?? { count: 0 };
    return count;
  } catch {
    return 0;
  }
}

// ─── Flush queue when back online ─────────────────────────────────────────────

const MAX_RETRIES = 5;
let isFlushing = false;

export async function flushQueue(): Promise<{
  flushed: number;
  remaining: number;
}> {
  if (isFlushing) return { flushed: 0, remaining: 0 };
  isFlushing = true;

  let flushed = 0;

  try {
    const database = await getDb();
    const now = Date.now();
    const maxAge = now - OFFLINE_QUEUE.maxAgeMs;

    // Purge stale items that have exceeded max age OR exceeded max retries
    await database.runAsync(
      "DELETE FROM offline_queue WHERE created_at < ? OR retry_count >= ?",
      [maxAge, MAX_RETRIES],
    );

    // Only process items whose next_retry_at is in the past
    const rows = await database.getAllAsync<{
      id: number;
      method: string;
      path: string;
      body: string | null;
      retry_count: number;
    }>(
      "SELECT * FROM offline_queue WHERE next_retry_at <= ? ORDER BY created_at ASC",
      [now],
    );

    for (const row of rows) {
      try {
        const body = row.body ? JSON.parse(row.body) : undefined;
        await api[row.method.toLowerCase() as "post" | "patch" | "delete"](
          row.path,
          body,
        );
        await database.runAsync("DELETE FROM offline_queue WHERE id = ?", [
          row.id,
        ]);
        flushed++;
      } catch (err: any) {
        const newRetryCount = row.retry_count + 1;
        const isNetworkError =
          err?.name === "TypeError" ||
          err?.message?.includes("Network") ||
          err?.message?.includes("fetch");

        if (!isNetworkError || newRetryCount >= MAX_RETRIES) {
          // Server-side error or too many retries — remove
          await database.runAsync("DELETE FROM offline_queue WHERE id = ?", [
            row.id,
          ]);
        } else {
          // Schedule next retry with backoff
          await database.runAsync(
            "UPDATE offline_queue SET retry_count = ?, next_retry_at = ? WHERE id = ?",
            [newRetryCount, nextRetryMs(newRetryCount), row.id],
          );
        }
        // Stop flushing on network failure — no point trying the rest
        if (isNetworkError) break;
      }
    }

    const { remaining } = (await database.getFirstAsync<{ remaining: number }>(
      "SELECT COUNT(*) as remaining FROM offline_queue",
    )) ?? { remaining: 0 };

    return { flushed, remaining };
  } finally {
    isFlushing = false;
  }
}

// ─── Auto-flush on reconnect ──────────────────────────────────────────────────

let netInfoUnsubscribe: (() => void) | null = null;
let wasOffline = false;

export function startOfflineQueueSync(): () => void {
  if (netInfoUnsubscribe) return netInfoUnsubscribe;

  netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = !!(state.isConnected && state.isInternetReachable);

    if (isOnline && wasOffline) {
      // Reconnected — flush immediately
      flushQueue().catch(console.error);
    }

    wasOffline = !isOnline;

    if (isOnline) {
      // Also flush on every reconnect-check (covers first load)
      flushQueue().catch(console.error);
    }
  });

  return () => {
    netInfoUnsubscribe?.();
    netInfoUnsubscribe = null;
  };
}
