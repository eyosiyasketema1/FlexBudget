import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import ExpenseCategory from './ExpenseCategory';

export default class ExpenseItem extends Model {
  static table = 'expense_items';
  static associations = {
    expense_categories: { type: 'belongs_to' as const, key: 'category_id' },
  };

  @field('category_id') categoryId!: string;
  @field('month_year') monthYear!: string;
  @field('name') name!: string;
  @field('budget_cap_cents') budgetCapCents!: number;
  @field('actual_spent_cents') actualSpentCents!: number;
  @field('rollover_enabled') rolloverEnabled!: boolean;
  @field('rollover_cents') rolloverCents!: number;
  @field('is_archived') isArchived!: boolean;
  @field('sort_order') sortOrder!: number;
  @readonly @date('created_at') createdAt!: Date;

  @relation('expense_categories', 'category_id') category!: ExpenseCategory;
}
