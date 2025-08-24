import { z } from 'zod';

// Expense用スキーマ

const sourceSchema = z.string().trim().min(1, '内容は必須です').max(100, '100文字以内');
const amountSchema = z.coerce.number().int('整数で入力してください').nonnegative('0以上で入力').lte(1_000_000_000, '大きすぎます');

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