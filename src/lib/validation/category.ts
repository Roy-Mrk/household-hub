import { z } from 'zod';

export const CategoryCreateSchema = z.object({
  name: z.string().trim().min(1, 'カテゴリ名は必須です').max(30, '30文字以内'),
  type: z.enum(['income', 'expense']),
});

export const SubcategoryCreateSchema = z.object({
  category_id: z.string().uuid('無効なカテゴリIDです'),
  name: z.string().trim().min(1, 'サブカテゴリ名は必須です').max(30, '30文字以内'),
});
