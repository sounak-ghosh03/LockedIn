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
        created_at INTEGER NOT NULL
      );
    `);
  }
  return db;
}

// ─── Enqueue a write ──────────────────────────────────────────────────────────

export async function enqueueWrite(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<void> {
  const database = await getDb();
  const now = Date.now();

  // Enforce max queue size
  const { count } = (await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM offline_queue",
  )) ?? { count: 0 };

  if (count >= OFFLINE_QUEUE.maxSize) {
    // Drop oldest item to make room
    await database.runAsync(
      "DELETE FROM offline_queue WHERE id = (SELECT id FROM offline_queue ORDER BY created_at ASC LIMIT 1)",
    );
  }

  await database.runAsync(
    "INSERT INTO offline_queue (method, path, body, created_at) VALUES (?, ?, ?, ?)",
    [method, path, body ? JSON.stringify(body) : null, now],
  );
}

// ─── Flush queue when back online ─────────────────────────────────────────────

let isFlushing = false;

export async function flushQueue(): Promise<void> {
  if (isFlushing) return;
  isFlushing = true;

  try {
    const database = await getDb();
    const maxAge = Date.now() - OFFLINE_QUEUE.maxAgeMs;

    // Purge stale items first
    await database.runAsync("DELETE FROM offline_queue WHERE created_at < ?", [
      maxAge,
    ]);

    const rows = await database.getAllAsync<{
      id: number;
      method: string;
      path: string;
      body: string | null;
    }>("SELECT * FROM offline_queue ORDER BY created_at ASC");

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
      } catch {
        // If a single item fails, stop the flush (retry on next reconnect)
        break;
      }
    }
  } finally {
    isFlushing = false;
  }
}

// ─── Auto-flush on reconnect ──────────────────────────────────────────────────

let netInfoUnsubscribe: (() => void) | null = null;

export function startOfflineQueueSync(): () => void {
  if (netInfoUnsubscribe) return netInfoUnsubscribe;

  netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      flushQueue().catch(console.error);
    }
  });

  return () => {
    netInfoUnsubscribe?.();
    netInfoUnsubscribe = null;
  };
}
