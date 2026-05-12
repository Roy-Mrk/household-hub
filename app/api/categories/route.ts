import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/apiHelpers';
import { CategoryCreateSchema, zodErrorToMessages } from '@/lib/validation';
import { logger } from '@/lib/logger';

// GET ?type=income|expense: カテゴリ一覧（マスタ + ユーザー独自）をサブカテゴリ付きで返す
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase, user } = auth;

  const type = req.nextUrl.searchParams.get('type');
  if (type !== 'income' && type !== 'expense') {
    return NextResponse.json({ error: 'type は income または expense を指定してください' }, { status: 400 });
  }

  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, type, user_id, sort_order, subcategories(id, name, user_id, sort_order)')
      .eq('type', type)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // マスタ → ユーザー独自の順で並べる
    const sorted = (categories ?? []).sort((a, b) => {
      if (a.user_id === null && b.user_id !== null) return -1;
      if (a.user_id !== null && b.user_id === null) return 1;
      return a.sort_order - b.sort_order;
    });

    // 各カテゴリのサブカテゴリも並び替え
    const result = sorted.map(cat => ({
      ...cat,
      subcategories: [...((cat.subcategories as { id: string; name: string; user_id: string | null; sort_order: number }[]) ?? [])].sort((a, b) => {
        if (a.user_id === null && b.user_id !== null) return -1;
        if (a.user_id !== null && b.user_id === null) return 1;
        return a.sort_order - b.sort_order;
      }),
    }));

    return NextResponse.json({ categories: result }, { status: 200 });
  } catch (e) {
    logger.error('GET categories error:', e);
    return NextResponse.json({ error: 'カテゴリの取得に失敗しました' }, { status: 500 });
  }
}

// POST: ユーザー独自カテゴリを作成
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase, user } = auth;

  try {
    const json = await request.json();
    const parsed = CategoryCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', issues: zodErrorToMessages(parsed.error) },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: parsed.data.name, type: parsed.data.type, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (e) {
    logger.error('POST categories error:', e);
    return NextResponse.json({ error: 'カテゴリの作成に失敗しました' }, { status: 500 });
  }
}
