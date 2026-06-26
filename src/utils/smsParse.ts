// Pure parser for Ethiopian bank / mobile-money / telecom transaction SMS.
// Covers CBE, Awash, Dashen (Amole), Abyssinia, Bunna, Wegagen, Hibret, Nib,
// Zemen, Oromia / Coopay, telebirr, M-Pesa, CBE Birr, HelloCash, etc. Works on
// English and common Amharic phrasings. No native deps — unit-tested in Node.
// Given a raw SMS body it extracts the transaction amount and whether money
// left (debit) or came in (credit). Returns null when it isn't a money SMS.

export interface ParsedSms {
  amountCents: number;
  kind: 'debit' | 'credit';
}

// Money leaving the account (an expense). English + Amharic.
const DEBIT_WORDS = [
  'debit', 'debited', 'transferred', 'transfer of', 'paid', 'payment', 'purchase', 'purchased',
  'withdrawn', 'withdrawal', 'withdrew', 'sent', 'bought', 'spent', 'charged', 'billed', 'deducted',
  'ተከፍሏል', 'ከፍለዋል', 'ከፍለው', 'ተልኳል', 'ልከዋል', 'ተቀንሷል', 'ወጪ', 'ገዝተዋል',
];
// Money coming in (income — captured as credit, not logged as spend).
const CREDIT_WORDS = [
  'credit', 'credited', 'received', 'deposited', 'deposit', 'refunded', 'refund',
  'ገብቷል', 'ተቀብለዋል', 'ገቢ', 'ተቀብለው', 'ተመላሽ',
];

// "ETB 1,250.00" / "Birr 250" / "Br 99.50" / "ብር 100" and the amount-first form.
const CURRENCY = /(?:etb|birr|br|ብር)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:etb|birr|br|ብር)/gi;

// Words that precede a *balance* figure (to exclude it from the txn amount).
const BALANCE_HINT = /(bal(?:ance)?|ቀሪ)\b[^.\d]*$/;

function toCents(numeric: string): number {
  const n = parseFloat(numeric.replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Parse a transaction SMS. Returns null if it isn't a recognizable money SMS. */
export function parseTransactionSms(body: string): ParsedSms | null {
  if (!body) return null;
  const text = body.toLowerCase();

  const hasDebit = DEBIT_WORDS.some((w) => text.includes(w));
  const hasCredit = CREDIT_WORDS.some((w) => text.includes(w));
  if (!hasDebit && !hasCredit) return null;
  // If both appear, lean on debit (e.g. "debited ... balance" noise).
  const kind: 'debit' | 'credit' = hasDebit ? 'debit' : 'credit';

  // Collect all currency amounts with their position in the string.
  const found: { cents: number; index: number }[] = [];
  let m: RegExpExecArray | null;
  CURRENCY.lastIndex = 0;
  while ((m = CURRENCY.exec(text)) !== null) {
    const numeric = m[1] ?? m[2];
    if (!numeric) continue;
    // Skip data-bundle figures (e.g. "Br 1024 MB", "100 GB") — those are not money.
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 6);
    if (/^\s*(?:mb|gb|kb|tb|mbps|gbps|byte|bytes|min|mins|minute|sec)\b/i.test(after)) continue;
    found.push({ cents: toCents(numeric), index: m.index });
  }
  if (found.length === 0) return null;

  // Skip amounts that are clearly a balance figure ("balance"/"ቀሪ" just before).
  const isBalance = (idx: number) => BALANCE_HINT.test(text.slice(Math.max(0, idx - 20), idx));
  const txn = found.find((f) => f.cents > 0 && !isBalance(f.index)) ?? found.find((f) => f.cents > 0);
  if (!txn) return null;

  return { amountCents: txn.cents, kind };
}
