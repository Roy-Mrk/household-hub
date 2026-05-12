import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiHelpers';
import { SubcategoryCreateSchema, zodErrorToMessages } from '@/lib/validation';
import { logger } from '@/lib/logger';

// POST: ユーザー独自サブカテゴリを作成
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase, user } = auth;

  try {
    const json = await request.json();
    const parsed = SubcategoryCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', issues: zodErrorToMessages(parsed.error) },
        { status: 400 }
      );
    }

    // 指定カテゴリが参照可能か確認
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', parsed.data.category_id)
      .maybeSingle();

    if (!cat) return NextResponse.json({ error: 'カテゴリが見つかりません' }, { status: 404 });

    const { data, error } = await supabase
      .from('subcategories')
      .insert({ category_id: parsed.data.category_id, name: parsed.data.name, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ subcategory: data }, { status: 201 });
  } catch (e) {
    logger.error('POST subcategories error', { error: e });
    return NextResponse.json({ error: 'サブカテゴリの作成に失敗しました' }, { status: 500 });
  }
}
