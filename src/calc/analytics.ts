import type { Cents } from '@/utils/money';
import type { MonthSnapshot, Bucket, ItemVariance } from './types';
import { computeTotals, computeBenchmark, itemVariance } from './engine';
import { daysInMonth, currentMonthYear } from '@/utils/date';

// ─────────────────────────────────────────────────────────────────────────
// Analytics — pure functions over MonthSnapshot(s). No DB, no React.
// Powers the Insights screen: safe-to-spend, composition, savings goal, trends.
// ─────────────────────────────────────────────────────────────────────────

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const notArchived = (x: { isArchived?: boolean }) => !x.isArchived;

function activeItems(snapshot: MonthSnapshot) {
  return snapshot.categories.filter(notArchived).flatMap((c) => c.items.filter(notArchived));
}

// ── Safe to spend + daily allowance + month-pace projection ───────────────

export interface BucketRemaining {
  bucket: Bucket | null;
  name: string;
  budgetCents: Cents;
  actualCents: Cents;
  remainingCents: Cents;
}

export interface SafeToSpend {
  incomeCents: Cents;
  budgetedCents: Cents;
  spentCents: Cents;
  remainingCents: Cents; // budget - spent (what's left to spend within plan)
  daysInMonth: number;
  daysElapsed: number;
  daysLeft: number;
  dailyAllowanceCents: Cents; // remaining / daysLeft
  projectedSpendCents: Cents; // spend pace × full month
  projectedNetCents: Cents; // income - projected spend
  onPace: boolean; // projected spend within budget
  perBucket: BucketRemaining[];
}

/**
 * `today` defaults to the real date. `daysElapsed` is clamped to the month:
 * for the current month it's today's day; past months count as fully elapsed;
 * future months as not started.
 */
export function computeSafeToSpend(snapshot: MonthSnapshot, today: Date = new Date()): SafeToSpend {
  const t = computeTotals(snapshot);
  const dim = daysInMonth(snapshot.monthYear);
  const cur = currentMonthYear(today);

  let daysElapsed: number;
  if (snapshot.monthYear === cur) daysElapsed = Math.min(today.getDate(), dim);
  else if (snapshot.monthYear < cur) daysElapsed = dim;
  else daysElapsed = 0;
  const daysLeft = Math.max(dim - daysElapsed, 0);

  const remaining = t.totalBudgetedCents - t.totalActualCents;
  const dailyAllowance = daysLeft > 0 ? Math.round(remaining / daysLeft) : 0;
  const projectedSpend =
    daysElapsed > 0 ? Math.round((t.totalActualCents / daysElapsed) * dim) : t.totalActualCents;

  const perBucket: BucketRemaining[] = snapshot.categories.filter(notArchived).map((c) => {
    const items = c.items.filter(notArchived);
    const budget = sum(items.map((i) => i.budgetCapCents));
    const actual = sum(items.map((i) => i.actualSpentCents));
    return { bucket: c.bucket ?? null, name: c.name, budgetCents: budget, actualCents: actual, remainingCents: budget - actual };
  });

  return {
    incomeCents: t.totalIncomeCents,
    budgetedCents: t.totalBudgetedCents,
    spentCents: t.totalActualCents,
    remainingCents: remaining,
    daysInMonth: dim,
    daysElapsed,
    daysLeft,
    dailyAllowanceCents: dailyAllowance,
    projectedSpendCents: projectedSpend,
    projectedNetCents: t.totalIncomeCents - projectedSpend,
    onPace: projectedSpend <= t.totalBudgetedCents,
    perBucket,
  };
}

// ── Composition: bucket shares + top items + overspends ───────────────────

export interface CompositionSlice {
  bucket: Bucket;
  actualCents: Cents;
  percent: number; // of total spent
}

export interface Composition {
  totalSpentCents: Cents;
  slices: CompositionSlice[]; // needs/wants/savings spending
  untaggedCents: Cents;
}

const BUCKETS: Bucket[] = ['needs', 'wants', 'savings', 'church'];

/** Spending split across buckets (by actual spend in each bucket's items). */
export function computeComposition(snapshot: MonthSnapshot): Composition {
  const byBucket: Record<Bucket, Cents> = { needs: 0, wants: 0, savings: 0, church: 0 };
  let untagged = 0;
  for (const c of snapshot.categories.filter(notArchived)) {
    const actual = sum(c.items.filter(notArchived).map((i) => i.actualSpentCents));
    if (c.bucket === 'needs' || c.bucket === 'wants' || c.bucket === 'savings' || c.bucket === 'church') byBucket[c.bucket] += actual;
    else untagged += actual;
  }
  const totalSpent = byBucket.needs + byBucket.wants + byBucket.savings + byBucket.church + untagged;
  const slices = BUCKETS.map((b) => ({
    bucket: b,
    actualCents: byBucket[b],
    percent: totalSpent > 0 ? (byBucket[b] / totalSpent) * 100 : 0,
  }));
  return { totalSpentCents: totalSpent, slices, untaggedCents: untagged };
}

export interface NamedItem {
  id: string;
  name: string;
  actualSpentCents: Cents;
  budgetCapCents: Cents;
}

/** Top N items by actual spend (descending), spend > 0 only. */
export function topSpendItems(snapshot: MonthSnapshot, n = 5): NamedItem[] {
  return activeItems(snapshot)
    .filter((i) => i.actualSpentCents > 0)
    .map((i) => ({ id: i.id, name: i.name, actualSpentCents: i.actualSpentCents, budgetCapCents: i.budgetCapCents }))
    .sort((a, b) => b.actualSpentCents - a.actualSpentCents)
    .slice(0, n);
}

/** Items over budget, biggest overage first. */
export function overspentItems(snapshot: MonthSnapshot): ItemVariance[] {
  return activeItems(snapshot)
    .map(itemVariance)
    .filter((v) => v.state === 'over')
    .sort((a, b) => a.varianceCents - b.varianceCents); // most negative first
}

// ── Savings goal ──────────────────────────────────────────────────────────

export interface SavingsGoal {
  targetCents: Cents;
  savedCents: Cents; // actual net saved this month
  percent: number; // saved / target
  met: boolean;
  shortfallCents: Cents; // target - saved (>=0)
}

export function computeSavingsGoal(snapshot: MonthSnapshot, targetCents: Cents): SavingsGoal {
  const saved = computeTotals(snapshot).actualNetSavedCents;
  const percent = targetCents > 0 ? (saved / targetCents) * 100 : 0;
  return {
    targetCents,
    savedCents: saved,
    percent,
    met: targetCents > 0 && saved >= targetCents,
    shortfallCents: Math.max(targetCents - saved, 0),
  };
}

// ── Budget allocation appraisal (50/30/20 on the PLAN, not actuals) ────────

const TARGET: Record<Bucket, number> = { needs: 50, wants: 20, savings: 20, church: 10 };

export interface BudgetBucket {
  id: string;
  name: string;
  bucket: Bucket | null;
  budgetedCents: Cents;
  percentOfIncome: number;
  targetPercent: number | null;
  withinTarget: boolean;
}

export interface BudgetAllocation {
  incomeCents: Cents;
  totalBudgetedCents: Cents;
  unallocatedCents: Cents; // income − budgeted (can be negative = over-allocated)
  buckets: BudgetBucket[];
}

/**
 * Appraises each main category's BUDGET against its allocation cap.
 * The cap is the category's own `allocationCapPercent` if set, otherwise the
 * 50/30/20 default for its bucket. Needs/Wants are caps (good at-or-under);
 * Savings is a floor (good at-or-above).
 */
export function computeBudgetAllocation(snapshot: MonthSnapshot): BudgetAllocation {
  const income = computeTotals(snapshot).totalIncomeCents;
  const buckets: BudgetBucket[] = snapshot.categories.filter(notArchived).map((c) => {
    const budgeted = sum(c.items.filter(notArchived).map((i) => i.budgetCapCents));
    const pct = income > 0 ? (budgeted / income) * 100 : 0;
    // Category's own cap wins; fall back to the bucket's 50/30/20 default.
    const target = c.allocationCapPercent ?? (c.bucket ? TARGET[c.bucket] : null);
    const within =
      target == null ? true : c.bucket === 'savings' ? pct >= target : pct <= target;
    return {
      id: c.id,
      name: c.name,
      bucket: c.bucket ?? null,
      budgetedCents: budgeted,
      percentOfIncome: pct,
      targetPercent: target,
      withinTarget: within,
    };
  });
  const totalBudgeted = sum(buckets.map((b) => b.budgetedCents));
  return {
    incomeCents: income,
    totalBudgetedCents: totalBudgeted,
    unallocatedCents: income - totalBudgeted,
    buckets,
  };
}

// ── Trends over months ─────────────────────────────────────────────────────

export interface TrendPoint {
  monthYear: string;
  incomeCents: Cents;
  spentCents: Cents;
  netSavedCents: Cents;
  savingsRatePercent: number;
  needsCents: Cents;
  wantsCents: Cents;
  savingsCents: Cents;
}

export function buildTrends(snapshots: MonthSnapshot[]): TrendPoint[] {
  return [...snapshots]
    .sort((a, b) => a.monthYear.localeCompare(b.monthYear))
    .map((s) => {
      const t = computeTotals(s);
      const comp = computeComposition(s);
      const get = (b: Bucket) => comp.slices.find((x) => x.bucket === b)?.actualCents ?? 0;
      return {
        monthYear: s.monthYear,
        incomeCents: t.totalIncomeCents,
        spentCents: t.totalActualCents,
        netSavedCents: t.actualNetSavedCents,
        savingsRatePercent: t.totalIncomeCents > 0 ? (t.actualNetSavedCents / t.totalIncomeCents) * 100 : 0,
        needsCents: get('needs'),
        wantsCents: get('wants'),
        savingsCents: get('savings'),
      };
    });
}

export { computeBenchmark };
