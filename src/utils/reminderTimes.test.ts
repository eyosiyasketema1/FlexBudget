import { reminderTimes } from './reminderSchedule';

describe('reminderTimes', () => {
  it('returns the start time once for count 1', () => {
    expect(reminderTimes(8, 0, 20, 0, 1)).toEqual([{ hour: 8, minute: 0 }]);
  });

  it('spreads evenly across the window', () => {
    expect(reminderTimes(8, 0, 20, 0, 3)).toEqual([
      { hour: 8, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 20, minute: 0 },
    ]);
  });

  it('collapses to one when start equals end', () => {
    expect(reminderTimes(8, 0, 8, 0, 4)).toEqual([{ hour: 8, minute: 0 }]);
  });

  it('handles a window wrapping past midnight', () => {
    // 22:00 → 02:00, 3 times → 22:00, 00:00, 02:00
    expect(reminderTimes(22, 0, 2, 0, 3)).toEqual([
      { hour: 22, minute: 0 },
      { hour: 0, minute: 0 },
      { hour: 2, minute: 0 },
    ]);
  });
});
