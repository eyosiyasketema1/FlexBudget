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
  'debit', 'debited', 'transferred', 'transfer', 'paid', 'payment', 'purchase', 'purchased',
  'withdrawn', 'withdrawal', 'withdrew', 'sent', 'bought', 'spent', 'charged', 'billed', 'deducted',
  'transacted', 'transaction', 'pos', 'atm',
  'ተከፍሏል', 'ከፍለዋል', 'ከፍለው', 'ተልኳል', 'ልከዋል', 'ተቀንሷል', 'ወጪ', 'ገዝተዋል', 'ተላልፏል',
];
// Money coming in (income — captured as credit, not logged as spend).
const CREDIT_WORDS = [
  'credit', 'credited', 'received', 'deposited', 'deposit', 'refunded', 'refund',
  'ገብቷል', 'ተቀብለዋል', 'ገቢ', 'ተቀብለው', 'ተመላሽ',
];

// Banking context — lets us recognize a transaction even when the wording is
// unusual (some banks, e.g. Hibret, phrase it differently). Used as a fallback.
const BANK_CONTEXT = /\b(a\/c|acct|account|balance|bal|avail|ref|reference|txn|trx|pos|atm|wallet)\b|ሂሳብ|ቀሪ/i;
// Promotional/marketing wording — don't capture these via the bank-context fallback.
const PROMO = /\b(bonus|offer|win|won|discount|promo|congratulation|sale|free|reward|gift|prize|loan|interest rate)\b/i;

// Currency amount: "ETB 1,250.00" / "Birr 250" / "Br. 99.50" / "ETB500" / "ብር 100"
// and the amount-first form "250.00 Br". Allows an optional . or : after the token.
// `(?![a-z0-9])` is an Amharic-safe word boundary (plain \b fails after ብር).
const CURRENCY = /(?:etb|birr|br|ብር)[.\s:]*(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*(?:etb|birr|br|ብር)(?![a-z0-9])/gi;

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
  // Recognize a transaction if there's a clear debit/credit word, OR a banking
  // context (account/balance/ref/txn…) which covers banks with unusual wording.
  // The bank-context fallback is skipped for promotional messages.
  if (!hasDebit && !hasCredit && (!BANK_CONTEXT.test(text) || PROMO.test(text))) return null;
  // If both appear, lean on debit. With only bank-context, assume debit (spend).
  const kind: 'debit' | 'credit' = hasCredit && !hasDebit ? 'credit' : 'debit';

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
