import { parseTransactionSms } from './smsParse';
import { addPendingSms } from '@/data/repository';

// Wraps the native incoming-SMS reader. The module only exists in a dev/
// production build (not Expo Go), so we require it defensively — the app keeps
// working everywhere; SMS capture simply stays off where it's unavailable.
let mod: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  mod = require('@maniac-tech/react-native-expo-read-sms');
} catch {
  mod = null;
}

// `mod.default` is the underlying NativeModule (RNExpoReadSms). It's only
// non-null when the native code is actually in the build — so this is true in a
// dev/production build and false in Expo Go or a build made before the module
// was added.
export function isSmsModuleAvailable(): boolean {
  return !!(mod && mod.default && typeof mod.startReadSMS === 'function');
}

export async function requestSmsPermission(): Promise<boolean> {
  if (!mod?.requestReadSMSPermission) return false;
  try {
    return (await mod.requestReadSMSPermission()) === true;
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

// The library calls back as (status, sms). `sms` is usually the message string,
// but can be an object with a body/message field depending on the device.
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
  if (started) return true;
  const granted = await requestSmsPermission();
  if (!granted) return false;
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
