// Pure helper (no native deps) for spacing reminders across a daily window.
// Kept separate from notifications.ts so it's unit-testable in Node.

/** N evenly-spaced times (h:m) across a daily start→end window (wraps midnight). */
export function reminderTimes(startH: number, startM: number, endH: number, endM: number, count: number): { hour: number; minute: number }[] {
  const start = startH * 60 + startM;
  let end = endH * 60 + endM;
  if (end < start) end += 24 * 60; // window wraps past midnight
  const n = Math.max(1, Math.floor(count));
  if (n === 1 || end === start) return [{ hour: startH, minute: startM }];
  const step = (end - start) / (n - 1);
  const out: { hour: number; minute: number }[] = [];
  for (let i = 0; i < n; i++) {
    const m = Math.round(start + step * i) % (24 * 60);
    out.push({ hour: Math.floor(m / 60), minute: m % 60 });
  }
  return out;
}
