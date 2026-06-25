import { currentPeriodKey, periodRange, daysInPeriod, daysElapsedInPeriod } from './date';

describe('pay cycle (start day = 25)', () => {
  const D = 25;

  it('maps a date after the 25th to the current month anchor', () => {
    expect(currentPeriodKey(new Date(2026, 1, 26), D)).toBe('2026-02'); // Feb 26 → Feb period
    expect(currentPeriodKey(new Date(2026, 1, 25), D)).toBe('2026-02'); // exactly the 25th
  });

  it('maps a date before the 25th to the previous month anchor', () => {
    expect(currentPeriodKey(new Date(2026, 2, 3), D)).toBe('2026-02'); // Mar 3 → Feb 25–Mar 24 period
    expect(currentPeriodKey(new Date(2026, 1, 24), D)).toBe('2026-01'); // Feb 24 → Jan period
  });

  it('period range runs payday → day-before-next-payday', () => {
    const { start, end } = periodRange('2026-02', D); // Feb period
    expect(start.getMonth()).toBe(1); // Feb
    expect(start.getDate()).toBe(25);
    expect(end.getMonth()).toBe(2); // Mar
    expect(end.getDate()).toBe(24);
    expect(daysInPeriod('2026-02', D)).toBe(28); // Feb 25 → Mar 24 = 28 days
  });

  it('days elapsed within / past / before a period', () => {
    expect(daysElapsedInPeriod('2026-02', new Date(2026, 1, 25), D)).toBe(1); // first day
    expect(daysElapsedInPeriod('2026-02', new Date(2026, 2, 1), D)).toBe(5); // Feb25..Mar1 = 5 days
    expect(daysElapsedInPeriod('2026-02', new Date(2026, 5, 1), D)).toBe(28); // long past → full
    expect(daysElapsedInPeriod('2026-02', new Date(2026, 0, 1), D)).toBe(0); // before start
  });
});

describe('pay cycle (start day = 1, calendar months)', () => {
  it('behaves like calendar months', () => {
    expect(currentPeriodKey(new Date(2026, 5, 15), 1)).toBe('2026-06');
    expect(daysInPeriod('2026-06', 1)).toBe(30); // June has 30 days
  });
});
