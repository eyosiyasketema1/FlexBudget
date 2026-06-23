import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class IncomeItem extends Model {
  static table = 'income_items';

  @field('month_year') monthYear!: string;
  @field('label') label!: string;
  @field('category') category!: string;
  @field('amount_cents') amountCents!: number;
  @field('is_archived') isArchived!: boolean;
  @readonly @date('created_at') createdAt!: Date;
}
