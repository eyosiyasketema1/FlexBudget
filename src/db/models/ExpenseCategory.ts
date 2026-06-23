import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, children, lazy } from '@nozbe/watermelondb/decorators';
import { Q } from '@nozbe/watermelondb';
import ExpenseItem from './ExpenseItem';

export default class ExpenseCategory extends Model {
  static table = 'expense_categories';
  static associations = {
    expense_items: { type: 'has_many' as const, foreignKey: 'category_id' },
  };

  @field('month_year') monthYear!: string;
  @field('name') name!: string;
  @field('allocation_cap_percent') allocationCapPercent!: number | null;
  @field('bucket') bucket!: 'needs' | 'wants' | 'savings' | null;
  @field('is_archived') isArchived!: boolean;
  @field('sort_order') sortOrder!: number;
  @readonly @date('created_at') createdAt!: Date;

  @children('expense_items') items!: Query<ExpenseItem>;

  // Live list of non-archived items in this category.
  @lazy activeItems = this.items.extend(Q.where('is_archived', false));
}
