import { buildPayload, encryptPayload, decryptPayload, BackupData } from './backupCodec';

const sample: BackupData = {
  months: [{ monthYear: '2026-06', isLocked: false }],
  income: [{ monthYear: '2026-06', label: 'Salary', category: 'Job', amountCents: 3_500_000, isArchived: false }],
  categories: [{ id: 'CAT-1', monthYear: '2026-06', name: 'Essentials', allocationCapPercent: 60, bucket: 'needs', isArchived: false, sortOrder: 0 }],
  items: [{ categoryId: 'CAT-1', monthYear: '2026-06', name: 'Rent', budgetCapCents: 1_400_000, actualSpentCents: 1_400_000, rolloverEnabled: false, rolloverCents: 0, isArchived: false, sortOrder: 0 }],
};

describe('encrypted backup codec (Phase 5)', () => {
  it('round-trips data through encrypt → decrypt', () => {
    const payload = buildPayload(sample, new Date('2026-06-24T00:00:00Z'));
    const cipher = encryptPayload(payload, 'correct horse');
    const restored = decryptPayload(cipher, 'correct horse');
    expect(restored.data).toEqual(sample);
    expect(restored.exportedAt).toBe('2026-06-24T00:00:00.000Z');
  });

  it('produces ciphertext that does not leak plaintext', () => {
    const cipher = encryptPayload(buildPayload(sample), 'correct horse');
    expect(cipher).not.toContain('Salary');
    expect(cipher).not.toContain('Essentials');
  });

  it('rejects a wrong passphrase', () => {
    const cipher = encryptPayload(buildPayload(sample), 'correct horse');
    expect(() => decryptPayload(cipher, 'wrong passphrase')).toThrow(/decrypt/i);
  });

  it('refuses too-short passphrases on export', () => {
    expect(() => encryptPayload(buildPayload(sample), 'abc')).toThrow(/6 characters/);
  });

  it('rejects a non-FlexBudget file', () => {
    // valid-looking cipher but wrong contents
    const foreign = encryptPayload({ magic: 'OTHER', version: 1, exportedAt: '', data: sample } as any, 'passphrase1');
    expect(() => decryptPayload(foreign, 'passphrase1')).toThrow(/FlexBudget/);
  });
});
