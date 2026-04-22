import { z } from 'zod';
import { sourceSchema, amountSchema, categorySchema, entryDateSchema } from './common';

export const IncomeCreateSchema = z.object({
  source: sourceSchema,
  amount: amountSchema,
  category: categorySchema,
  entry_date: entryDateSchema,
});

export const IncomeUpdateSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    source: sourceSchema.optional(),
    amount: amountSchema.optional(),
  })
  .refine(obj => obj.source !== undefined || obj.amount !== undefined, {
    message: '更新項目がありません',
  });