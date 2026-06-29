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
  capPercent: number; // allocation cap (50 / 20 / 20 / 10)
  items: { name: string; budgetCents: number }[];
}

export const BUDGET_TEMPLATE: TemplateCategory[] = [
  {
    name: 'Needs',
    bucket: 'needs',
    capPercent: 50,
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
    capPercent: 20,
    items: [
      { name: 'Lifestyle', budgetCents: 300_000 },
      { name: 'Coffee', budgetCents: 100_000 },
      { name: 'Gym', budgetCents: 150_000 },
    ],
  },
  {
    name: 'Church',
    bucket: 'church',
    capPercent: 10,
    items: [{ name: 'Tithe and gift', budgetCents: 330_000 }],
  },
  {
    name: 'Savings',
    bucket: 'savings',
    capPercent: 20,
    items: [
      // Remainder so every birr is allocated (zero-based):
      // 35,000 − 21,930 needs − 5,500 wants − 3,300 church = 4,270.
      { name: 'Savings', budgetCents: 427_000 },
    ],
  },
];

// Display order for the buckets on the home screen.
export const BUCKET_ORDER: Bucket[] = ['needs', 'wants', 'church', 'savings'];
