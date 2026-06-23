import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Month extends Model {
  static table = 'months';

  @field('month_year') monthYear!: string;
  @field('is_locked') isLocked!: boolean;
  @readonly @date('created_at') createdAt!: Date;
}
