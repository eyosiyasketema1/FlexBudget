import { parseTransactionSms } from './smsParse';

describe('parseTransactionSms', () => {
  it('parses a telebirr transfer (debit), ignoring the balance', () => {
    const sms = 'Dear customer, you have transferred ETB 250.00 to ABEBE. Your balance is ETB 1,300.45. Ref 123';
    expect(parseTransactionSms(sms)).toEqual({ amountCents: 25000, kind: 'debit' });
  });

  it('parses the real CBE debit format with trailing period', () => {
    const sms = 'Dear Eyosiyas Ketema Akililu A debit transaction of ETB 5.0. has occurred on your account. Current Balance is ETB 1,234.56';
    expect(parseTransactionSms(sms)).toEqual({ amountCents: 500, kind: 'debit' });
  });

  it('parses the real telebirr "you have paid" airtime format', () => {
    const sms = 'Dear Eyosiyas You have paid ETB 5.00 for package Daily Internet. Ref 778';
    expect(parseTransactionSms(sms)).toEqual({ amountCents: 500, kind: 'debit' });
  });

  it('parses a CBE debit with thousands separator', () => {
    const sms = 'Dear Customer your account has been debited with ETB 1,250.50. Available Balance ETB 4,000.00';
    expect(parseTransactionSms(sms)).toEqual({ amountCents: 125050, kind: 'debit' });
  });

  it('parses an M-Pesa style payment', () => {
    const sms = 'Confirmed. ETB 320.00 paid to SHOA SUPERMARKET. New M-PESA balance is ETB 540.00';
    expect(parseTransactionSms(sms)).toEqual({ amountCents: 32000, kind: 'debit' });
  });

  it('parses amount written before the currency', () => {
    const sms = 'You paid 99.50 Birr at Shoa Supermarket. Thank you.';
    expect(parseTransactionSms(sms)).toEqual({ amountCents: 9950, kind: 'debit' });
  });

  it('parses an Amharic debit (ተከፍሏል / ብር)', () => {
    const sms = 'ውድ ደንበኛ ብር 150.00 ተከፍሏል። ቀሪ ሂሳብ ብር 2,000.00';
    expect(parseTransactionSms(sms)).toEqual({ amountCents: 15000, kind: 'debit' });
  });

  it('classifies an incoming transfer as credit', () => {
    const sms = 'You have received ETB 500.00 from SARA. Balance ETB 900.00';
    expect(parseTransactionSms(sms)).toEqual({ amountCents: 50000, kind: 'credit' });
  });

  it('handles whole-birr amounts with no decimals', () => {
    const sms = 'ETB 50 has been debited for airtime.';
    expect(parseTransactionSms(sms)).toEqual({ amountCents: 5000, kind: 'debit' });
  });

  it('returns null for a non-transaction message', () => {
    expect(parseTransactionSms('Your OTP code is 123456. Do not share it.')).toBeNull();
    expect(parseTransactionSms('Hello, are we still meeting at 5?')).toBeNull();
    expect(parseTransactionSms('')).toBeNull();
  });

  it('returns null when there is a keyword but no amount', () => {
    expect(parseTransactionSms('Your account was debited. Contact us for details.')).toBeNull();
  });

  it('parses "Br." with a period (Hibret/others)', () => {
    const sms = 'Dear customer, your A/C is debited Br. 750.00. Available balance Br. 12,000.00';
    expect(parseTransactionSms(sms)).toEqual({ amountCents: 75000, kind: 'debit' });
  });

  it('captures via bank context when wording is unusual', () => {
    const sms = 'Dear Customer, A/C 100xxxx POS transaction ETB 1,200.00. Ref TX998. Bal ETB 3,400.00';
    expect(parseTransactionSms(sms)).toEqual({ amountCents: 120000, kind: 'debit' });
  });

  it('ignores promotional bank messages', () => {
    expect(parseTransactionSms('Open an account today and get ETB 50 bonus! Limited offer.')).toBeNull();
  });

  it('does not treat a data-bundle size as money', () => {
    // currency token sitting next to a data size must not be captured as ETB
    expect(parseTransactionSms('Your account is debited Br 1024 MB data bonus')).toBeNull();
    expect(parseTransactionSms('You have paid for 1.5 GB. Br 99 deducted')).toEqual({ amountCents: 9900, kind: 'debit' });
    expect(parseTransactionSms('You have bought 100 MB and 50 min for ETB 27.00')).toEqual({ amountCents: 2700, kind: 'debit' });
  });
});
