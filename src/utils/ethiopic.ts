// Dependency-free Gregorian ↔ Ethiopian calendar conversion (JDN method).
// Pure math, unit-tested — no native module, safe for Expo. Covers the display
// layer: the app stores periods as Gregorian "YYYY-MM" internally and only
// converts for labels when the user picks the Ethiopian calendar.
//
// (For richer needs later — holidays, Geez numerals, Bahire Hasab — the `kenat`
// npm package is the most capable Ethiopian-calendar library.)

const ETHIOPIC_EPOCH = 1723856; // JDN of 1 Meskerem 1 (Amete Mihret)

function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export interface EthiopianDate { year: number; month: number; day: number }

/** Convert a Gregorian Y/M/D (month 1-12) to an Ethiopian date (month 1-13). */
export function gregorianToEthiopian(year: number, month: number, day: number): EthiopianDate {
  const jdn = gregorianToJDN(year, month, day);
  const r = (jdn - ETHIOPIC_EPOCH) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  return {
    year: 4 * Math.floor((jdn - ETHIOPIC_EPOCH) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: (n % 30) + 1,
  };
}

// 13 Ethiopian months. Amharic in script; the others use the common Latin
// transliteration (these names are used across Ethiopia regardless of language).
export const EC_MONTHS: Record<'en' | 'am' | 'om' | 'sw', string[]> = {
  en: ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'],
  om: ['Fulbaana', 'Onkololeessa', 'Sadaasa', 'Muddee', 'Amajjii', 'Guraandhala', 'Bitooteessa', 'Elba', 'Caamsaa', 'Waxabajjii', 'Adooleessa', 'Hagayya', 'Qaammee'],
  sw: ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'],
  am: ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'],
};

/** Ethiopian month + year label for a Gregorian month (uses mid-month, day 15). */
export function ethiopianMonthLabel(gYear: number, gMonth1to12: number, lang: 'en' | 'am' | 'om' | 'sw'): string {
  const e = gregorianToEthiopian(gYear, gMonth1to12, 15);
  const names = EC_MONTHS[lang] ?? EC_MONTHS.en;
  return `${names[e.month - 1]} ${e.year}`;
}
