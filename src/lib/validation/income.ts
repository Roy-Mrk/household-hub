import { z } from 'zod';
import { sourceSchema, amountSchema, entryDateSchema, ownerSchema, needsSettlementSchema } from './common';

const subcategoryIdSchema = z.string().uuid({ message: '無効なカテゴリIDです' });
const optionalSubcategoryId = subcategoryIdSchema.optional().or(z.literal('').transform(() => undefined));

export const IncomeCreateSchema = z.object({
  source: sourceSchema,
  amount: amountSchema,
  subcategory_id: optionalSubcategoryId,
  entry_date: entryDateSchema,
  owner: ownerSchema.default('self'),
  needs_settlement: needsSettlementSchema.default(true),
});

export const IncomeUpdateSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    source: sourceSchema.optional(),
    amount: amountSchema.optional(),
    subcategory_id: optionalSubcategoryId,
    entry_date: entryDateSchema.optional(),
    owner: ownerSchema.optional(),
    needs_settlement: needsSettlementSchema.optional(),
  })
  .refine(obj =>
    obj.source !== undefined || obj.amount !== undefined ||
    obj.subcategory_id !== undefined || obj.entry_date !== undefined ||
    obj.owner !== undefined || obj.needs_settlement !== undefined,
    { message: '更新項目がありません' }
  );
