import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

// Pure, dependency-light backup codec — no Expo, no DB. Kept separate from
// backup.ts so the encrypt/decrypt/validate logic can be unit-tested in Node.

export const BACKUP_VERSION = 1;
export const MAGIC = 'FLEXBUDGET';

export interface BackupData {
  months: unknown[];
  income: unknown[];
  categories: unknown[];
  items: unknown[];
}

export interface BackupPayload {
  magic: string;
  version: number;
  exportedAt: string;
  data: BackupData;
}

export function buildPayload(data: BackupData, now: Date = new Date()): BackupPayload {
  return { magic: MAGIC, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

export function encryptPayload(payload: BackupPayload, passphrase: string): string {
  if (passphrase.length < 6) throw new Error('Use a passphrase of at least 6 characters.');
  return AES.encrypt(JSON.stringify(payload), passphrase).toString();
}

/** Decrypt + validate. Throws on wrong passphrase, corruption, or wrong file. */
export function decryptPayload(cipher: string, passphrase: string): BackupPayload {
  let parsed: BackupPayload;
  try {
    const plain = AES.decrypt(cipher, passphrase).toString(Utf8);
    if (!plain) throw new Error('empty');
    parsed = JSON.parse(plain);
  } catch {
    throw new Error('Could not decrypt — wrong passphrase or corrupted file.');
  }
  if (parsed?.magic !== MAGIC) throw new Error('Not a FlexBudget backup file.');
  if (typeof parsed.version !== 'number' || !parsed.data) {
    throw new Error('Backup file is malformed.');
  }
  return parsed;
}
