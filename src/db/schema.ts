import { appSchema, tableSchema } from '@nozbe/watermelondb';

// Local-only relational schema. All money stored as INTEGER minor units (cents).
// Every income/expense row carries `month_year` so months are fully isolated.
export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'months',
      columns: [
        { name: 'month_year', type: 'string', isIndexed: true }, // "2026-06"
        { name: 'is_locked', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'income_items',
      columns: [
        { name: 'month_year', type: 'string', isIndexed: true },
        { name: 'label', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'amount_cents', type: 'number' },
        { name: 'is_archived', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'expense_categories',
      columns: [
        { name: 'month_year', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'allocation_cap_percent', type: 'number', isOptional: true },
        // v2: 50/30/20 benchmark bucket — 'needs' | 'wants' | 'savings' | null
        { name: 'bucket', type: 'string', isOptional: true },
        { name: 'is_archived', type: 'boolean' },
        { name: 'sort_order', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'expense_items',
      columns: [
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'month_year', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'budget_cap_cents', type: 'number' },
        { name: 'actual_spent_cents', type: 'number' },
        // v2: smart rollover
        { name: 'rollover_enabled', type: 'boolean' },
        { name: 'rollover_cents', type: 'number' }, // carried-in credit (+) or debt (-)
        { name: 'is_archived', type: 'boolean' },
        { name: 'sort_order', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
