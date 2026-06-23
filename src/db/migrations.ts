import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

// Explicit migrations from day one. Add a new entry here every time
// schema.version increments so real on-device data survives upgrades.
export const migrations = schemaMigrations({
  migrations: [
    {
      // v2: Phase 4 — smart rollover + 50/30/20 benchmark bucket.
      toVersion: 2,
      steps: [
        addColumns({
          table: 'expense_items',
          columns: [
            { name: 'rollover_enabled', type: 'boolean' },
            { name: 'rollover_cents', type: 'number' },
          ],
        }),
        addColumns({
          table: 'expense_categories',
          columns: [{ name: 'bucket', type: 'string', isOptional: true }],
        }),
      ],
    },
  ],
});
