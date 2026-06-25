import type { Bucket } from '@/calc/types';

// The default monthly budget. Used to seed the very first month; later months
// copy the previous month's structure forward. All amounts in integer cents.

export const SALARY_INCOME = {
  label: 'Salary Account',
  category: 'Primary Job',
  amountCents: 3_500_000, // 35,000
};

interface TemplateCategory {
  name: string;
  bucket: Bucket;
  items: { name: string; budgetCents: number }[];
}

export const BUDGET_TEMPLATE: TemplateCategory[] = [
  {
    name: 'Needs',
    bucket: 'needs',
    items: [
      { name: 'Rent', budgetCents: 1_400_000 },
      { name: 'Electric', budgetCents: 80_000 },
      { name: 'Internet', budgetCents: 130_000 },
      { name: 'Water', budgetCents: 33_000 },
      { name: 'Home expense', budgetCents: 300_000 },
      { name: 'Transport', budgetCents: 150_000 },
      { name: 'Utilities personal', budgetCents: 100_000 },
    ],
  },
  {
    name: 'Wants',
    bucket: 'wants',
    items: [
      { name: 'Date', budgetCents: 300_000 },
      { name: 'Coffee', budgetCents: 100_000 },
      { name: 'Gym', budgetCents: 150_000 },
    ],
  },
  {
    name: 'Savings',
    bucket: 'savings',
    items: [
      { name: 'Tithe and gift', budgetCents: 330_000 },
      // Remainder of income so every birr is allocated (zero-based): 35,000
      // total − 21,930 needs − 5,500 wants − 3,300 tithe = 4,270.
      { name: 'Savings', budgetCents: 427_000 },
    ],
  },
];

// Display order for the buckets on the home screen.
export const BUCKET_ORDER: Bucket[] = ['needs', 'wants', 'savings'];
