import type { Cents } from '@/utils/money';
import type {
  MonthSnapshot,
  MonthTotals,
  CategoryInput,
  ItemInput,
  IncomeInput,
  ItemVariance,
  CategoryRollup,
  VarianceState,
  Bucket,
} from './types';

// ─────────────────────────────────────────────────────────────────────────
// Pure calculation engine. No DB, no React. Everything in integer cents.
// These functions implement Section 3 (Real-time Calculation Matrix) plus
// the variance analysis behind Section 4 (Comparison Matrix).
// ─────────────────────────────────────────────────────────────────────────

const notArchived = (x: { isArchived?: boolean }) => !x.isArchived;

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** 1. Total Income = Σ income amounts (non-archived). */
export function totalIncome(income: IncomeInput[]): Cents {
  return sum(income.filter(notArchived).map((i) => i.amountCents));
}

function activeItems(categories: CategoryInput[]): ItemInput[] {
  return categories
    .filter(notArchived)
    .flatMap((c) => c.items.filter(notArchived));
}

/** 2. Total Budgeted = Σ budget caps (non-archived items in non-archived cats). */
export function totalBudgeted(categories: CategoryInput[]): Cents {
  return sum(activeItems(categories).map((i) => i.budgetCapCents));
}

/** 3. Total Actual = Σ actual spent. */
export function totalActual(categories: CategoryInput[]): Cents {
  return sum(activeItems(categories).map((i) => i.actualSpentCents));
}

/** Roll all five headline figures up in one pass. */
export function computeTotals(snapshot: MonthSnapshot): MonthTotals {
  const income = totalIncome(snapshot.income);
  const budgeted = totalBudgeted(snapshot.categories);
  const actual = totalActual(snapshot.categories);
  return {
    totalIncomeCents: income,
    totalBudgetedCents: budgeted,
    totalActualCents: actual,
    expectedSavingsCents: income - budgeted, // 4. Projected savings
    actualNetSavedCents: income - actual, // 5. Real-time actual savings
  };
}

// ── Variance ────────────────────────────────────────────────────────────

export function classifyVariance(budget: Cents, actual: Cents): VarianceState {
  if (actual > budget) return 'over';
  if (actual < budget) return 'under';
  return 'on_track';
}

export function itemVariance(item: ItemInput): ItemVariance {
  // Carried-in rollover credit/debt raises or lowers this month's effective cap.
  const rollover = item.rolloverCents ?? 0;
  const effectiveBudget = item.budgetCapCents + rollover;
  const variance = effectiveBudget - item.actualSpentCents;
  const percentUsed =
    effectiveBudget > 0 ? (item.actualSpentCents / effectiveBudget) * 100 : 0;
  return {
    id: item.id,
    name: item.name,
    budgetCapCents: item.budgetCapCents,
    actualSpentCents: item.actualSpentCents,
    rolloverCents: rollover,
    effectiveBudgetCents: effectiveBudget,
    varianceCents: variance,
    state: classifyVariance(effectiveBudget, item.actualSpentCents),
    percentUsed,
  };
}

/**
 * Smart rollover: how much an item carries into next month.
 * Unspent (effectiveBudget - actual) rolls forward as a credit; overspend
 * carries as a debt (negative). Only when the item opts in.
 */
export function rolloverCarry(item: ItemInput): Cents {
  if (!item.rolloverEnabled) return 0;
  const effectiveBudget = item.budgetCapCents + (item.rolloverCents ?? 0);
  return effectiveBudget - item.actualSpentCents;
}

export function categoryRollup(
  category: CategoryInput,
  totalIncomeCents: Cents,
): CategoryRollup {
  const items = category.items.filter(notArchived).map(itemVariance);
  const budgeted = sum(items.map((i) => i.budgetCapCents));
  const actual = sum(items.map((i) => i.actualSpentCents));
  const actualShare =
    totalIncomeCents > 0 ? (actual / totalIncomeCents) * 100 : 0;
  const capExceeded =
    category.allocationCapPercent != null &&
    actualShare > category.allocationCapPercent;
  return {
    id: category.id,
    name: category.name,
    budgetedCents: budgeted,
    actualCents: actual,
    varianceCents: budgeted - actual,
    state: classifyVariance(budgeted, actual),
    allocationCapPercent: category.allocationCapPercent,
    actualSharePercent: actualShare,
    capExceeded,
    items,
  };
}

export function rollupMonth(snapshot: MonthSnapshot): CategoryRollup[] {
  const income = totalIncome(snapshot.income);
  return snapshot.categories
    .filter(notArchived)
    .map((c) => categoryRollup(c, income));
}

// ── Month-vs-month delta (Section 4) ──────────────────────────────────────

export interface MonthDelta {
  totalIncomeDelta: Cents;
  totalBudgetedDelta: Cents;
  totalActualDelta: Cents;
  actualNetSavedDelta: Cents;
}

/** current - prior, per headline figure. Positive = current is higher. */
export function monthDelta(
  current: MonthSnapshot,
  prior: MonthSnapshot,
): MonthDelta {
  const c = computeTotals(current);
  const p = computeTotals(prior);
  return {
    totalIncomeDelta: c.totalIncomeCents - p.totalIncomeCents,
    totalBudgetedDelta: c.totalBudgetedCents - p.totalBudgetedCents,
    totalActualDelta: c.totalActualCents - p.totalActualCents,
    actualNetSavedDelta: c.actualNetSavedCents - p.actualNetSavedCents,
  };
}

// ── Predictive runway (Section 4 value-add) ───────────────────────────────

export interface RunwayResult {
  monthsAnalyzed: number;
  avgMonthlySpendCents: Cents;
  savingsCents: Cents; // accumulated net saved across the analyzed window
  runwayMonths: number; // savings / avg spend (Infinity if no spend)
}

/**
 * Estimate an emergency runway from recent history. Pass the most recent
 * months (any order); we use up to the last 3. Runway = accumulated net
 * savings ÷ average monthly actual spend.
 */
export function computeRunway(history: MonthSnapshot[], window = 3): RunwayResult {
  const sorted = [...history].sort((a, b) => a.monthYear.localeCompare(b.monthYear));
  const recent = sorted.slice(-window);
  if (recent.length === 0) {
    return { monthsAnalyzed: 0, avgMonthlySpendCents: 0, savingsCents: 0, runwayMonths: 0 };
  }
  const totalsList = recent.map(computeTotals);
  const spend = totalsList.map((t) => t.totalActualCents);
  const avgSpend = Math.round(sum(spend) / recent.length);
  const savings = sum(totalsList.map((t) => t.actualNetSavedCents));
  const runwayMonths = avgSpend > 0 ? savings / avgSpend : savings > 0 ? Infinity : 0;
  return {
    monthsAnalyzed: recent.length,
    avgMonthlySpendCents: avgSpend,
    savingsCents: savings,
    runwayMonths,
  };
}

// ── 50/30/20 benchmark overlay (Section 4 value-add) ──────────────────────

export interface BenchmarkBucket {
  bucket: Bucket;
  targetPercent: number; // 50 / 30 / 20
  targetCents: Cents; // targetPercent of income
  actualCents: Cents; // sum of actuals tagged to this bucket
  actualPercent: number; // actual / income * 100
  withinTarget: boolean;
}

export interface BenchmarkResult {
  totalIncomeCents: Cents;
  buckets: BenchmarkBucket[];
  untaggedActualCents: Cents; // actuals in categories with no bucket
  savingsRatePercent: number; // actual net saved / income
}

const FRAMEWORK: Record<Bucket, number> = { needs: 50, wants: 30, savings: 20 };

/**
 * Compare actual spending against the 50/30/20 rule. Categories opt in via a
 * `bucket` tag ('needs' | 'wants' | 'savings'). The 'savings' bucket's actual
 * is treated as money kept (net saved), not spent.
 */
export function computeBenchmark(snapshot: MonthSnapshot): BenchmarkResult {
  const t = computeTotals(snapshot);
  const income = t.totalIncomeCents;
  const cats = snapshot.categories.filter(notArchived);

  const spentByBucket: Record<Bucket, Cents> = { needs: 0, wants: 0, savings: 0 };
  let untagged = 0;
  for (const c of cats) {
    const actual = sum(c.items.filter(notArchived).map((i) => i.actualSpentCents));
    if (c.bucket === 'needs' || c.bucket === 'wants') spentByBucket[c.bucket] += actual;
    else if (c.bucket === 'savings') spentByBucket.savings += actual;
    else untagged += actual;
  }
  // Savings bucket = what's actually kept (net saved) rather than spent.
  spentByBucket.savings += t.actualNetSavedCents;

  const buckets: BenchmarkBucket[] = (Object.keys(FRAMEWORK) as Bucket[]).map((b) => {
    const targetPercent = FRAMEWORK[b];
    const targetCents = Math.round((income * targetPercent) / 100);
    const actualCents = spentByBucket[b];
    const actualPercent = income > 0 ? (actualCents / income) * 100 : 0;
    // For needs/wants, staying at or under target is good; for savings, at or above.
    const withinTarget = b === 'savings' ? actualCents >= targetCents : actualCents <= targetCents;
    return { bucket: b, targetPercent, targetCents, actualCents, actualPercent, withinTarget };
  });

  return {
    totalIncomeCents: income,
    buckets,
    untaggedActualCents: untagged,
    savingsRatePercent: income > 0 ? (t.actualNetSavedCents / income) * 100 : 0,
  };
}
