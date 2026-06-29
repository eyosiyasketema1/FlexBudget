import { NativeModules, PermissionsAndroid, Platform, AppState, AppStateStatus } from 'react-native';
import { parseTransactionSms } from './smsParse';
import { addPendingSms, getSmsLastScan, setSmsLastScan } from '@/data/repository';

// Reads the device SMS inbox for bank/telecom transactions. Reading the inbox
// (rather than only listening live) means messages that arrive while FlexBudget
// is closed are still caught the next time it opens, and a short foreground poll
// catches new ones within seconds while it's open.
//
// Backed by react-native-get-sms-android (NativeModules.Sms). The native module
// only exists in a dev/production build, so everything degrades to a no-op in
// Expo Go or any build without it.
const Sms: any = (NativeModules as any).Sms ?? null;

export function isSmsModuleAvailable(): boolean {
  return Platform.OS === 'android' && !!Sms && typeof Sms.list === 'function';
}

export async function hasSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  } catch {
    return false;
  }
}

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);
    return res[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/**
 * Run a raw SMS through the parser and, if it's an outgoing transaction, queue
 * it for the user to confirm. Returns true if something was captured. Used by
 * the inbox scan and the in-app "simulate" test button.
 */
export async function ingestSmsBody(body: string, sender?: string | null, date?: number | null): Promise<boolean> {
  const parsed = parseTransactionSms(body);
  if (!parsed || parsed.kind !== 'debit') return false; // only money going out
  await addPendingSms(body, parsed.amountCents, parsed.kind, sender ?? null, date ?? null);
  return true;
}

async function listInbox(minDate: number): Promise<{ body: string; date: number; address: string }[]> {
  if (!isSmsModuleAvailable()) return [];
  if (!(await hasSmsPermission())) return []; // never call native read without permission
  return new Promise((resolve) => {
    try {
      Sms.list(
        JSON.stringify({ box: 'inbox', minDate, maxCount: 200 }),
        () => resolve([]),
        (_count: number, listJson: string) => {
          try {
            const arr = JSON.parse(listJson);
            resolve(arr.map((m: any) => ({ body: String(m.body ?? ''), date: Number(m.date ?? 0), address: String(m.address ?? '') })));
          } catch {
            resolve([]);
          }
        },
      );
    } catch {
      resolve([]);
    }
  });
}

/** Shared scan: read inbox from `sinceMs`, queue debits, advance last-scan. */
async function doScan(sinceMs: number): Promise<number> {
  if (!isSmsModuleAvailable()) return 0;
  const last = await getSmsLastScan();
  const msgs = await listInbox(Math.max(0, sinceMs));
  let captured = 0;
  let maxDate = last;
  for (const m of msgs) {
    if (m.date > maxDate) maxDate = m.date;
    if (await ingestSmsBody(m.body, m.address, m.date)) captured++;
  }
  if (maxDate > last) await setSmsLastScan(maxDate);
  return captured;
}

/**
 * Automatic incremental scan (launch / resume / poll): only messages newer than
 * the last scan, so it never re-imports old history. First run sets a "now"
 * baseline.
 */
export async function scanInbox(): Promise<number> {
  if (!isSmsModuleAvailable()) return 0;
  const last = await getSmsLastScan();
  if (last === 0) {
    await setSmsLastScan(Date.now());
    return 0;
  }
  return doScan(last + 1);
}

/**
 * Manual scan triggered by the user: looks back over the last `days` days so it
 * picks up real transactions already sitting in the inbox (good for testing /
 * catching up). Duplicates are skipped by addPendingSms.
 */
export async function scanRecent(days = 7): Promise<number> {
  if (!isSmsModuleAvailable()) return 0;
  return doScan(Date.now() - days * 24 * 60 * 60 * 1000);
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;

/** Begin foreground polling + rescan-on-resume. Safe to call repeatedly. */
export function startSmsCapture(): void {
  if (!isSmsModuleAvailable()) return;
  void scanInbox();
  if (!pollTimer) pollTimer = setInterval(() => { void scanInbox(); }, 8000);
  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') void scanInbox();
    });
  }
}

export function stopSmsCapture(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (appStateSub) { appStateSub.remove(); appStateSub = null; }
}

/** Turn capture on: request permission, do an initial catch-up, start scanning. */
export async function enableSmsCapture(): Promise<boolean> {
  if (!isSmsModuleAvailable()) return false;
  const granted = await requestSmsPermission();
  if (!granted) return false;
  const firstTime = (await getSmsLastScan()) === 0;
  if (firstTime) await setSmsLastScan(Date.now()); // baseline so future scans are incremental
  startSmsCapture(); // poll + rescan-on-resume
  if (firstTime) await scanRecent(2); // one-time grab of the last 2 days so it feels automatic immediately
  return true;
}
