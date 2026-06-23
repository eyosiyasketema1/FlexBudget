import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { migrations } from './migrations';
import Month from './models/Month';
import IncomeItem from './models/IncomeItem';
import ExpenseCategory from './models/ExpenseCategory';
import ExpenseItem from './models/ExpenseItem';

// Local SQLite adapter — no server, no sync. Pure on-device storage.
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  dbName: 'flexbudget',
  onSetUpError: (error) => {
    // Surface fatal DB setup errors during development.
    // eslint-disable-next-line no-console
    console.error('Database failed to load', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Month, IncomeItem, ExpenseCategory, ExpenseItem],
});

export const collections = {
  months: database.get<Month>('months'),
  income: database.get<IncomeItem>('income_items'),
  categories: database.get<ExpenseCategory>('expense_categories'),
  items: database.get<ExpenseItem>('expense_items'),
};
