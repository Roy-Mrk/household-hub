import { z } from 'zod';
import { sourceSchema, amountSchema, categorySchema, entryDateSchema } from './common';

// 新規登録スキーマ
export const ExpenseCreateSchema = z.object({
  source: sourceSchema,
  amount: amountSchema,
  category: categorySchema,
  entry_date: entryDateSchema,
});

// 更新スキーマ
export const ExpenseUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  source: sourceSchema.optional(),
  amount: amountSchema.optional(),
}).refine(obj => obj.source !== undefined || obj.amount !== undefined, {
  message: '更新項目がありません',
});