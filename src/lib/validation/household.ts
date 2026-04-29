import { z } from 'zod';

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, '表示名は必須です')
  .max(50, '50文字以内で入力してください');

export const ProfileUpdateSchema = z.object({
  display_name: displayNameSchema,
});

export const HouseholdCreateSchema = z.object({
  name: z.string().trim().min(1, '世帯名は必須です').max(50, '50文字以内で入力してください'),
});

export const HouseholdInviteSchema = z.object({
  expires_in_hours: z.coerce.number().int().positive().max(720).optional(),
});

export const HouseholdJoinSchema = z.object({
  token: z.string().uuid('無効なトークンです'),
});
