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
 * Run a raw SMS body through the parser and, if it's an outgoing transaction,
 * queue it for the user to confirm. Returns true if something was captured.
 * Used by the inbox scan and the in-app "simulate" test button.
 */
export async function ingestSmsBody(body: string): Promise<boolean> {
  const parsed = parseTransactionSms(body);
  if (!parsed || parsed.kind !== 'debit') return false; // only money going out
  await addPendingSms(body, parsed.amountCents, parsed.kind);
  return true;
}

function listInbox(minDate: number): Promise<{ body: string; date: number }[]> {
  return new Promise((resolve) => {
    if (!isSmsModuleAvailable()) return resolve([]);
    try {
      Sms.list(
        JSON.stringify({ box: 'inbox', minDate, maxCount: 200 }),
        () => resolve([]),
        (_count: number, listJson: string) => {
          try {
            const arr = JSON.parse(listJson);
            resolve(arr.map((m: any) => ({ body: String(m.body ?? ''), date: Number(m.date ?? 0) })));
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

/** Scan the inbox for transactions newer than the last scan; queue any debits. */
export async function scanInbox(): Promise<number> {
  if (!isSmsModuleAvailable()) return 0;
  const last = await getSmsLastScan();
  // First ever scan: set a baseline of "now" so we don't import old history.
  if (last === 0) {
    await setSmsLastScan(Date.now());
    return 0;
  }
  const msgs = await listInbox(last + 1);
  let captured = 0;
  let maxDate = last;
  for (const m of msgs) {
    if (m.date > maxDate) maxDate = m.date;
    if (await ingestSmsBody(m.body)) captured++;
  }
  if (maxDate > last) await setSmsLastScan(maxDate);
  return captured;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;

/** Begin foreground polling + rescan-on-resume. Safe to call repeatedly. */
export function startSmsCapture(): void {
  if (!isSmsModuleAvailable()) return;
  void scanInbox();
  if (!pollTimer) pollTimer = setInterval(() => { void scanInbox(); }, 15000);
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

/** Turn capture on: request permission, set a baseline, start scanning. */
export async function enableSmsCapture(): Promise<boolean> {
  if (!isSmsModuleAvailable()) return false;
  const granted = await requestSmsPermission();
  if (!granted) return false;
  if ((await getSmsLastScan()) === 0) await setSmsLastScan(Date.now());
  startSmsCapture();
  return true;
}
