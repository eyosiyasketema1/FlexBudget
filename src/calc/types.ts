import type { Cents } from '@/utils/money';

// Plain shapes the calc engine works on. Deliberately decoupled from
// WatermelonDB models so the engine stays pure and unit-testable.

export interface IncomeInput {
  id: string;
  label: string;
  category: string;
  amountCents: Cents;
  isArchived?: boolean;
}

export type Bucket = 'needs' | 'wants' | 'savings';

export interface ItemInput {
  id: string;
  name: string;
  budgetCapCents: Cents;
  actualSpentCents: Cents;
  rolloverEnabled?: boolean;
  rolloverCents?: Cents; // carried-in credit (+) or debt (-)
  isArchived?: boolean;
}

export interface CategoryInput {
  id: string;
  name: string;
  allocationCapPercent: number | null;
  bucket?: Bucket | null;
  isArchived?: boolean;
  items: ItemInput[];
}

export interface MonthSnapshot {
  monthYear: string;
  income: IncomeInput[];
  categories: CategoryInput[];
}

export type VarianceState = 'over' | 'under' | 'on_track';

export interface MonthTotals {
  totalIncomeCents: Cents;
  totalBudgetedCents: Cents;
  totalActualCents: Cents;
  expectedSavingsCents: Cents; // income - budgeted
  actualNetSavedCents: Cents; // income - actual
}

export interface ItemVariance {
  id: string;
  name: string;
  budgetCapCents: Cents;
  actualSpentCents: Cents;
  rolloverCents: Cents; // carried-in
  effectiveBudgetCents: Cents; // budget_cap + rollover
  varianceCents: Cents; // effectiveBudget - actual ( >0 under, <0 over )
  state: VarianceState;
  percentUsed: number; // actual / effectiveBudget * 100 (0 if no budget)
}

export interface CategoryRollup {
  id: string;
  name: string;
  budgetedCents: Cents;
  actualCents: Cents;
  varianceCents: Cents;
  state: VarianceState;
  allocationCapPercent: number | null;
  actualSharePercent: number; // category actual / total income
  capExceeded: boolean; // actualShare > allocationCap
  items: ItemVariance[];
}
