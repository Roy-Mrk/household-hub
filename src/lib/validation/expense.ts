import { z } from 'zod';
import { sourceSchema, amountSchema } from './common';

// 新規登録スキーマ
export const ExpenseCreateSchema = z.object({
  source: sourceSchema,
  amount: amountSchema,
});

// 更新スキーマ
export const ExpenseUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  source: sourceSchema.optional(),
  amount: amountSchema.optional(),
}).refine(obj => obj.source !== undefined || obj.amount !== undefined, {
  message: '更新項目がありません',
});