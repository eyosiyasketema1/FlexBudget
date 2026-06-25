// SDK 54 promoted a new File/Paths API to the default export; the classic
// document-directory + read/write helpers live under /legacy.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { all, getDb, notifyChange } from '@/db';
import { buildPayload, encryptPayload, plainPayload, decryptPayload, isPlainBackup, parsePlainBackup, BackupData } from './backupCodec';

// Encrypted local backup. Serializes the whole on-device SQLite database to
// JSON, AES-encrypts it with a passphrase, and writes a file the user can move
// to another device via the share sheet. No server is involved. The pure
// encrypt/decrypt/validate logic lives in backupCodec.ts (unit-tested).

async function serializeAll(): Promise<BackupData> {
  const [months, income, categories, items] = await Promise.all([
    all<any>('SELECT * FROM months'),
    all<any>('SELECT * FROM income_items'),
    all<any>('SELECT * FROM expense_categories'),
    all<any>('SELECT * FROM expense_items'),
  ]);
  return { months, income, categories, items };
}

/**
 * Export a backup file and open the share sheet. The passphrase is OPTIONAL:
 * blank → a quick unencrypted backup; set → AES-encrypted.
 */
export async function exportEncryptedBackup(passphrase: string): Promise<string> {
  const pass = passphrase.trim();
  if (pass.length > 0 && pass.length < 6) {
    throw new Error('Use a passphrase of at least 6 characters, or leave it blank.');
  }
  const payload = buildPayload(await serializeAll());
  const content = pass.length > 0 ? encryptPayload(payload, pass) : plainPayload(payload);
  const stamp = new Date().toISOString().slice(0, 10);
  const uri = `${FileSystem.documentDirectory}flexbudget-backup-${stamp}.fbk`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/octet-stream', dialogTitle: 'FlexBudget backup' });
  }
  return uri;
}

/**
 * Restore a backup file. Auto-detects whether it's plain or encrypted — only
 * encrypted files need the passphrase. REPLACES all current local data (the
 * caller should confirm with the user first).
 */
export async function importEncryptedBackup(fileUri: string, passphrase: string): Promise<void> {
  const content = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
  let payload;
  if (isPlainBackup(content)) {
    payload = parsePlainBackup(content);
  } else {
    if (!passphrase.trim()) throw new Error('This backup is encrypted — enter its passphrase to restore.');
    payload = decryptPayload(content, passphrase.trim());
  }
  const d = payload.data as BackupData;

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      'DELETE FROM expense_items; DELETE FROM expense_categories; DELETE FROM income_items; DELETE FROM months;',
    );

    for (const m of d.months as any[]) {
      await db.runAsync('INSERT INTO months (month_year, is_locked, created_at) VALUES (?, ?, ?)', [
        m.month_year, m.is_locked ?? 0, m.created_at ?? Date.now(),
      ]);
    }
    for (const i of d.income as any[]) {
      await db.runAsync(
        'INSERT INTO income_items (id, month_year, label, category, amount_cents, is_archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [i.id, i.month_year, i.label, i.category, i.amount_cents, i.is_archived ?? 0, i.created_at ?? Date.now()],
      );
    }
    for (const c of d.categories as any[]) {
      await db.runAsync(
        'INSERT INTO expense_categories (id, month_year, name, allocation_cap_percent, bucket, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.month_year, c.name, c.allocation_cap_percent ?? null, c.bucket ?? null, c.is_archived ?? 0, c.sort_order ?? 0, c.created_at ?? Date.now()],
      );
    }
    for (const it of d.items as any[]) {
      await db.runAsync(
        'INSERT INTO expense_items (id, category_id, month_year, name, budget_cap_cents, actual_spent_cents, rollover_enabled, rollover_cents, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [it.id, it.category_id, it.month_year, it.name, it.budget_cap_cents, it.actual_spent_cents, it.rollover_enabled ?? 0, it.rollover_cents ?? 0, it.is_archived ?? 0, it.sort_order ?? 0, it.created_at ?? Date.now()],
      );
    }
  });

  notifyChange();
}
