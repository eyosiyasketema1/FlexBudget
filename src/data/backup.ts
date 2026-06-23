import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { database, collections } from '@/db';
import { buildPayload, encryptPayload, decryptPayload, BackupData } from './backupCodec';

// Encrypted local backup. Serializes the whole on-device database to JSON,
// AES-encrypts it with a user passphrase, and writes a file the user can move
// to another device via the share sheet. No server is involved. The pure
// encrypt/decrypt/validate logic lives in backupCodec.ts (unit-tested).

async function serializeAll(): Promise<BackupData> {
  const [months, income, categories, items] = await Promise.all([
    collections.months.query().fetch(),
    collections.income.query().fetch(),
    collections.categories.query().fetch(),
    collections.items.query().fetch(),
  ]);
  return {
    months: months.map((m) => ({ monthYear: m.monthYear, isLocked: m.isLocked })),
    income: income.map((i) => ({
      monthYear: i.monthYear, label: i.label, category: i.category,
      amountCents: i.amountCents, isArchived: i.isArchived,
    })),
    categories: categories.map((c) => ({
      id: c.id, monthYear: c.monthYear, name: c.name,
      allocationCapPercent: c.allocationCapPercent, bucket: c.bucket,
      isArchived: c.isArchived, sortOrder: c.sortOrder,
    })),
    items: items.map((it) => ({
      categoryId: it.categoryId, monthYear: it.monthYear, name: it.name,
      budgetCapCents: it.budgetCapCents, actualSpentCents: it.actualSpentCents,
      rolloverEnabled: it.rolloverEnabled, rolloverCents: it.rolloverCents,
      isArchived: it.isArchived, sortOrder: it.sortOrder,
    })),
  };
}

/** Export an AES-encrypted backup file and open the share sheet. */
export async function exportEncryptedBackup(passphrase: string): Promise<string> {
  const payload = buildPayload(await serializeAll());
  const cipher = encryptPayload(payload, passphrase);
  const stamp = new Date().toISOString().slice(0, 10);
  const uri = `${FileSystem.documentDirectory}flexbudget-backup-${stamp}.fbk`;
  await FileSystem.writeAsStringAsync(uri, cipher, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/octet-stream', dialogTitle: 'FlexBudget backup' });
  }
  return uri;
}

/**
 * Decrypt and restore a backup file. REPLACES all current local data after a
 * successful decrypt (the caller should confirm with the user first).
 */
export async function importEncryptedBackup(fileUri: string, passphrase: string): Promise<void> {
  const cipher = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
  const payload = decryptPayload(cipher, passphrase);

  await database.write(async () => {
    await database.unsafeResetDatabase();
  });

  // Rebuild, preserving category→item links via a temp-id map.
  const catIdMap = new Map<string, string>();
  await database.write(async () => {
    for (const m of payload.data.months as any[]) {
      await collections.months.create((row) => {
        row.monthYear = m.monthYear; row.isLocked = !!m.isLocked;
      });
    }
    for (const i of payload.data.income as any[]) {
      await collections.income.create((row) => {
        row.monthYear = i.monthYear; row.label = i.label; row.category = i.category;
        row.amountCents = i.amountCents; row.isArchived = !!i.isArchived;
      });
    }
    for (const c of payload.data.categories as any[]) {
      const created = await collections.categories.create((row) => {
        row.monthYear = c.monthYear; row.name = c.name;
        row.allocationCapPercent = c.allocationCapPercent; row.bucket = c.bucket ?? null;
        row.isArchived = !!c.isArchived; row.sortOrder = c.sortOrder;
      });
      catIdMap.set(c.id, created.id);
    }
    for (const it of payload.data.items as any[]) {
      await collections.items.create((row) => {
        row.categoryId = catIdMap.get(it.categoryId) ?? it.categoryId;
        row.monthYear = it.monthYear; row.name = it.name;
        row.budgetCapCents = it.budgetCapCents; row.actualSpentCents = it.actualSpentCents;
        row.rolloverEnabled = !!it.rolloverEnabled; row.rolloverCents = it.rolloverCents ?? 0;
        row.isArchived = !!it.isArchived; row.sortOrder = it.sortOrder;
      });
    }
  });
}
