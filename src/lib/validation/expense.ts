import { z } from 'zod';
import { sourceSchema, amountSchema, entryDateSchema } from './common';

const subcategoryIdSchema = z.string().uuid({ message: 'カテゴリを選択してください' });

export const ExpenseCreateSchema = z.object({
  source: sourceSchema,
  amount: amountSchema,
  subcategory_id: subcategoryIdSchema,
  entry_date: entryDateSchema,
});

export const ExpenseUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  source: sourceSchema.optional(),
  amount: amountSchema.optional(),
  subcategory_id: subcategoryIdSchema.optional(),
  entry_date: entryDateSchema.optional(),
}).refine(obj =>
  obj.source !== undefined || obj.amount !== undefined ||
  obj.subcategory_id !== undefined || obj.entry_date !== undefined,
  { message: '更新項目がありません' }
);
