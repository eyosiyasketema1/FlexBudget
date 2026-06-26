import { gregorianToEthiopian, ethiopianMonthLabel } from './ethiopic';

describe('Ethiopian calendar conversion', () => {
  it('maps Ethiopian New Year (Enkutatash) correctly', () => {
    // 11 Sept 2024 = Meskerem 1, 2017 EC
    expect(gregorianToEthiopian(2024, 9, 11)).toEqual({ year: 2017, month: 1, day: 1 });
    // 11 Sept 2025 = Meskerem 1, 2018 EC
    expect(gregorianToEthiopian(2025, 9, 11)).toEqual({ year: 2018, month: 1, day: 1 });
  });

  it('converts a mid-year Gregorian date', () => {
    // 26 June 2026 falls in Sene 2018 EC
    const e = gregorianToEthiopian(2026, 6, 26);
    expect(e.year).toBe(2018);
    expect(e.month).toBe(10); // Sene
  });

  it('produces a localized Ethiopian month label', () => {
    expect(ethiopianMonthLabel(2026, 6, 'en')).toBe('Sene 2018');
    expect(ethiopianMonthLabel(2026, 6, 'am')).toBe('ሰኔ 2018');
  });
});
