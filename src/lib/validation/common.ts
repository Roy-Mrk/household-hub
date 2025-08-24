import { z } from 'zod';
import type { ZodError } from 'zod';
// 共通スキーマ
export const sourceSchema = z.string().trim().min(1, '内容は必須です').max(100, '100文字以内');
export const amountSchema = z.coerce.number().int('整数で入力してください').nonnegative('0以上で入力').lte(1_000_000_000, '大きすぎます');

export function zodErrorToMessages(e: ZodError) {
  return e.issues.map((err) => ({
    path: Array.isArray(err.path) ? err.path.join('.') : '',
    message: err.message,
  }));
}