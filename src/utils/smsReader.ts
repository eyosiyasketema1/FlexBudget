import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { parseTransactionSms } from './smsParse';
import { addPendingSms } from '@/data/repository';

// Wraps the native incoming-SMS reader (@maniac-tech/react-native-expo-read-sms).
// The native module only exists in a dev/production build, never in Expo Go, so
// we require it defensively and detect the linked native module directly via
// NativeModules — the app keeps working everywhere; capture just stays off when
// the native side isn't present.
let mod: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  mod = require('@maniac-tech/react-native-expo-read-sms');
} catch {
  mod = null;
}

function nativePresent(): boolean {
  return Platform.OS === 'android' && !!NativeModules.RNExpoReadSms;
}

export function isSmsModuleAvailable(): boolean {
  return !!(mod && typeof mod.startReadSMS === 'function' && nativePresent());
}

// Request RECEIVE_SMS + READ_SMS ourselves. (The library's own request helper
// has a bug — it compares the requestMultiple() result object to a string and
// returns false even after the user grants — so we handle it directly here.)
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    ]);
    const granted = PermissionsAndroid.RESULTS.GRANTED;
    return (
      res[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === granted &&
      res[PermissionsAndroid.PERMISSIONS.READ_SMS] === granted
    );
  } catch {
    return false;
  }
}

/**
 * Run a raw SMS body through the parser and, if it's an outgoing transaction,
 * queue it for the user to confirm. Returns true if something was captured.
 * Used by both the live listener and the in-app "simulate" test button.
 */
export async function ingestSmsBody(body: string): Promise<boolean> {
  const parsed = parseTransactionSms(body);
  if (!parsed || parsed.kind !== 'debit') return false; // only money going out
  await addPendingSms(body, parsed.amountCents, parsed.kind);
  return true;
}

// The native module emits `received_sms` as a single string: "[address, body]".
// The JS callback receives (status, sms). Pull the string that carries digits.
function extractBody(args: any[]): string | null {
  for (const a of args) {
    if (typeof a === 'string' && /\d/.test(a) && a.length > 4 && !/^success$/i.test(a)) return a;
    if (a && typeof a === 'object') {
      const cand = a.messageBody ?? a.body ?? a.message ?? a.sms;
      if (typeof cand === 'string' && /\d/.test(cand)) return cand;
    }
  }
  return null;
}

let started = false;
/** Request permission and begin listening for incoming transaction SMS. */
export async function startSmsListener(): Promise<boolean> {
  if (!isSmsModuleAvailable()) return false;
  const granted = await requestSmsPermission();
  if (!granted) return false;
  if (started) return true;
  try {
    mod.startReadSMS(
      (...args: any[]) => {
        const body = extractBody(args);
        if (body) void ingestSmsBody(body);
      },
      () => { /* listener error — ignore, stays off */ },
    );
    started = true;
    return true;
  } catch {
    return false;
  }
}
