import { z } from 'zod';
import type { ZodError } from 'zod';
// 共通スキーマ
export const sourceSchema = z.string().trim().min(1, '内容は必須です').max(100, '100文字以内');
export const amountSchema = z.coerce.number().int('整数で入力してください').nonnegative('0以上で入力').lte(1_000_000_000, '大きすぎます');

export const categorySchema = z
  .string()
  .trim()
  .min(1, 'カテゴリは必須です')
  .max(50, '50文字以内');

export const entryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください')
  .refine((s) => {
    const d = new Date(s);
    return !isNaN(d.getTime());
  }, '正しい日付を入力してください');

export function zodErrorToMessages(e: ZodError) {
  return e.issues.map((err) => ({
    path: Array.isArray(err.path) ? err.path.join('.') : '',
    message: err.message,
  }));
}