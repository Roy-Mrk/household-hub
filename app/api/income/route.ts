import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, parseListParams } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { IncomeCreateSchema, IncomeUpdateSchema, zodErrorToMessages } from '@/lib/validation';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  try {
    const params = parseListParams(new URL(req.url).searchParams);
    let query = supabase.from('income').select(
      '*, subcategory:subcategory_id(name, category:category_id(name))',
      { count: 'exact' }
    );

    if (params.q)    query = query.ilike('source', `%${params.q}%`);
    if (params.from) query = query.gte('entry_date', params.from);
    if (params.to)   query = query.lte('entry_date', params.to);

    const { data, error, count } = await query
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (error) throw error;
    return NextResponse.json({ data, count, limit: params.limit, offset: params.offset }, { status: 200 });
  } catch (error) {
    console.error('GET income error:', error);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { user, supabase } = auth;

  try {
    const json = await request.json();
    const parsed = IncomeCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', issues: zodErrorToMessages(parsed.error) }, { status: 400 });
    }
    const { source, amount, entry_date, owner, needs_settlement } = parsed.data;
    let { subcategory_id } = parsed.data;

    // 未選択の場合はマスタの「未分類」（income型）を自動セット
    if (!subcategory_id) {
      const { data: miscCat } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('name', '未分類').eq('type', 'income').is('user_id', null)
        .maybeSingle();
      if (miscCat) {
        const { data: miscSub } = await supabaseAdmin
          .from('subcategories')
          .select('id')
          .eq('category_id', miscCat.id).eq('name', '未分類').is('user_id', null)
          .maybeSingle();
        subcategory_id = miscSub?.id ?? undefined;
      }
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('income')
      .insert([{ source, amount, subcategory_id: subcategory_id ?? null, entry_date, owner, needs_settlement, user_id: user.id, household_id: membership?.household_id ?? null }])
      .select();

    if (error) throw error;
    return NextResponse.json({ message: '作成OK', data }, { status: 200 });
  } catch (error) {
    console.error('POST income error:', error);
    return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  try {
    const json = await request.json();
    const parsed = IncomeUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', issues: zodErrorToMessages(parsed.error) }, { status: 400 });
    }
    const { id, ...rest } = parsed.data;

    const { data, error } = await supabase.from('income').update(rest).eq('id', id).select();
    if (error) throw error;
    return NextResponse.json({ message: '更新OK', data }, { status: 200 });
  } catch (error) {
    console.error('PATCH income error:', error);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  try {
    const idParam = new URL(request.url).searchParams.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'id が必要です' }, { status: 400 });

    const { error } = await supabase.from('income').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ message: '削除OK' }, { status: 200 });
  } catch (error) {
    console.error('DELETE income error:', error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
