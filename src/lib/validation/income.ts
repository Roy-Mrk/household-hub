import { z } from 'zod';
import { sourceSchema, amountSchema } from './common';

export const IncomeCreateSchema = z.object({
  source: sourceSchema,
  amount: amountSchema,
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