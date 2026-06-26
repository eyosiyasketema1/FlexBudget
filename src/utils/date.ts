// month_year helpers. Format is always "YYYY-MM".

import { ethiopianMonthLabel } from './ethiopic';

type LangCode = 'en' | 'am' | 'om' | 'sw';
type CalendarSystem = 'gregorian' | 'ethiopian';

// Localized Gregorian month names (short). am/om are best-effort transliterations
// (worth a native-speaker pass); the Ethiopian calendar gives proper local months.
const GREG_MONTHS: Record<LangCode, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sw: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
  om: ['Jan', 'Feb', 'Mar', 'Ebl', 'Mey', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  am: ['ጃንዩ', 'ፌብሩ', 'ማርች', 'ኤፕሪ', 'ሜይ', 'ጁን', 'ጁላይ', 'ኦገስ', 'ሴፕቴ', 'ኦክቶ', 'ኖቬም', 'ዲሴም'],
};

// Display caches, set by the app from the saved language + calendar settings.
let _lang: LangCode = 'en';
let _calendar: CalendarSystem = 'gregorian';
export function setLangCache(l: string): void { _lang = (['en', 'am', 'om', 'sw'].includes(l) ? l : 'en') as LangCode; }
export function setCalendarCache(c: string): void { _calendar = c === 'ethiopian' ? 'ethiopian' : 'gregorian'; }
export function getCalendarCache(): CalendarSystem { return _calendar; }

export function currentMonthYear(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Add (or subtract) whole months to a "YYYY-MM" key. */
export function shiftMonth(monthYear: string, delta: number): string {
  const [y, m] = monthYear.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return currentMonthYear(date);
}

export function nextMonth(monthYear: string): string {
  return shiftMonth(monthYear, 1);
}

export function prevMonth(monthYear: string): string {
  return shiftMonth(monthYear, -1);
}

/** Number of days in a "YYYY-MM" month. */
export function daysInMonth(monthYear: string): number {
  const [y, m] = monthYear.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * "2026-06" -> "Jun 2026" (Gregorian) or "ሰኔ 2018" (Ethiopian), localized.
 * lang/calendar default to the cached settings; pass explicit values (e.g. from
 * the useMonthFmt hook) so React components re-render when the setting changes.
 */
export function formatMonthLabel(monthYear: string, lang: string = _lang, calendar: string = _calendar): string {
  const [y, m] = monthYear.split('-').map(Number);
  const l = (['en', 'am', 'om', 'sw'].includes(lang) ? lang : 'en') as LangCode;
  if (calendar === 'ethiopian') return ethiopianMonthLabel(y, m, l);
  return `${GREG_MONTHS[l][m - 1]} ${y}`;
}

/** Short month form for chart axes / banners, localized + calendar-aware. */
export function formatMonthShort(monthYear: string, lang: string = _lang, calendar: string = _calendar): string {
  const [y, m] = monthYear.split('-').map(Number);
  const l = (['en', 'am', 'om', 'sw'].includes(lang) ? lang : 'en') as LangCode;
  if (calendar === 'ethiopian') return ethiopianMonthLabel(y, m, l).split(' ')[0].slice(0, 4);
  return GREG_MONTHS[l][m - 1];
}

// ── Pay cycle ──────────────────────────────────────────────────────────────
// A budget "period" runs from the cycle start day of its anchor month to the
// day before the next start day. It's keyed by the anchor month ("YYYY-MM" of
// the month it STARTS in). Default start day = 1 (calendar months).

let _cycleStartDay = 1;

export function setCycleStartDayCache(day: number): void {
  _cycleStartDay = Math.min(28, Math.max(1, Math.floor(day) || 1));
}
export function getCycleStartDay(): number {
  return _cycleStartDay;
}

/** The period key (anchor month) that `today` falls into. */
export function currentPeriodKey(today: Date = new Date(), startDay: number = _cycleStartDay): string {
  const anchor = new Date(today.getFullYear(), today.getMonth(), 1);
  if (today.getDate() < startDay) anchor.setMonth(anchor.getMonth() - 1);
  return currentMonthYear(anchor);
}

/** Start (inclusive) and end (inclusive) dates of a period. */
export function periodRange(key: string, startDay: number = _cycleStartDay): { start: Date; end: Date } {
  const [y, m] = key.split('-').map(Number);
  const start = new Date(y, m - 1, startDay);
  const nextStart = new Date(y, m, startDay); // anchor + 1 month
  const end = new Date(nextStart);
  end.setDate(nextStart.getDate() - 1);
  return { start, end };
}

export function daysInPeriod(key: string, startDay: number = _cycleStartDay): number {
  const { start, end } = periodRange(key, startDay);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

/**
 * Days elapsed in a period as of `today` (1..daysInPeriod). Past periods return
 * the full length; not-yet-started periods return 0.
 */
export function daysElapsedInPeriod(key: string, today: Date = new Date(), startDay: number = _cycleStartDay): number {
  const { start, end } = periodRange(key, startDay);
  if (today < start) return 0;
  if (today > end) return daysInPeriod(key, startDay);
  return Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - start.getTime()) / 86_400_000) + 1;
}

/** "Jun 25 – Jul 24" label for a period (only useful when start day ≠ 1). */
export function formatPeriodRange(key: string, startDay: number = _cycleStartDay): string {
  if (startDay === 1) return formatMonthLabel(key);
  // In the Ethiopian calendar, fall back to the month label (day math differs).
  if (_calendar === 'ethiopian') return formatMonthLabel(key);
  const { start, end } = periodRange(key, startDay);
  const f = (d: Date) => `${(GREG_MONTHS[_lang] ?? GREG_MONTHS.en)[d.getMonth()]} ${d.getDate()}`;
  return `${f(start)} – ${f(end)}`;
}
