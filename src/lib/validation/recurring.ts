import { z } from 'zod';
import { sourceSchema, amountSchema, ownerSchema, needsSettlementSchema } from './common';

const subcategoryIdSchema = z.string().uuid({ message: '無効なカテゴリIDです' })
  .optional()
  .or(z.literal('').transform(() => undefined));

export const RecurringCreateSchema = z.object({
  type: z.enum(['income', 'expense'], { message: '種別はincomeまたはexpenseです' }),
  source: sourceSchema,
  amount: amountSchema,
  subcategory_id: subcategoryIdSchema,
  owner: ownerSchema.default('self'),
  needs_settlement: needsSettlementSchema.default(false),
  frequency: z.enum(['monthly', 'yearly'], { message: '頻度はmonthlyまたはyearlyです' }),
  day_of_month: z.number({ message: '日は必須です' }).int().min(1).max(31, { message: '日は1〜31の範囲で入力してください' }),
  month_of_year: z.number().int().min(1).max(12).optional().nullable(),
}).refine(
  (d) => d.frequency !== 'yearly' || (d.month_of_year != null),
  { message: '毎年の場合は月を指定してください', path: ['month_of_year'] }
);

export const RecurringUpdateSchema = z.object({
  id: z.number().int().positive(),
  source: sourceSchema.optional(),
  amount: amountSchema.optional(),
  subcategory_id: subcategoryIdSchema,
  owner: ownerSchema.optional(),
  needs_settlement: needsSettlementSchema.optional(),
  frequency: z.enum(['monthly', 'yearly']).optional(),
  day_of_month: z.number().int().min(1).max(31).optional(),
  month_of_year: z.number().int().min(1).max(12).optional().nullable(),
  is_active: z.boolean().optional(),
});
