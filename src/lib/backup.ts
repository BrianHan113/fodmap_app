import type { FodmapDB } from '../db/db';
import { TABLES } from '../db/db';

export const BACKUP_APP = 'fodmap-helper';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

export async function exportData(db: FodmapDB): Promise<Backup> {
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) tables[t] = await db.table(t).toArray();
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
}

export function validateBackup(data: unknown): asserts data is Backup {
  const b = data as Backup;
  if (!b || b.app !== BACKUP_APP || typeof b.tables !== 'object') {
    throw new Error('This file is not a FODMAP Helper backup.');
  }
  if (b.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app.');
  }
}

/** Replaces all app data with the backup contents. */
export async function importData(db: FodmapDB, data: unknown): Promise<void> {
  validateBackup(data);
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = data.tables[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(rows);
    }
  });
}

export async function resetData(db: FodmapDB): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear();
  });
}
