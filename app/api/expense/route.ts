import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, parseListParams } from '@/lib/apiHelpers';
import { ExpenseCreateSchema, ExpenseUpdateSchema } from '@/lib/validation/expense';
import { zodErrorToMessages } from '@/lib/validation/common';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  try {
    const params = parseListParams(new URL(req.url).searchParams);
    let query = supabase.from('expense').select('*', { count: 'exact' });

    if (params.q)    query = query.ilike('source', `%${params.q}%`);
    if (params.from) query = query.gte('entry_date', params.from);
    if (params.to)   query = query.lte('entry_date', params.to);

    const { data, error, count } = await query
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (error) throw error;
    return NextResponse.json({ data, count, limit: params.limit, offset: params.offset }, { status: 200 });
  } catch (e) {
    console.error('GET expense error:', e);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { user, supabase } = auth;

  try {
    const json = await request.json();
    const parsed = ExpenseCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', issues: zodErrorToMessages(parsed.error) },
        { status: 400 }
      );
    }
    const { source, amount, category, entry_date } = parsed.data as { source: string; amount: number; category: string; entry_date: string };

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('expense')
      .insert([{ source, amount, category, entry_date, user_id: user.id, household_id: membership?.household_id ?? null }])
      .select();

    if (error) throw error;
    return NextResponse.json({ message: '作成OK', data }, { status: 200 });
  } catch (e) {
    console.error('POST expense error:', e);
    return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  try {
    const json = await request.json();
    const parsed = ExpenseUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', issues: zodErrorToMessages(parsed.error) },
        { status: 400 }
      );
    }
    const { id, ...patch } = parsed.data as { id: number; source?: string; amount?: number; category?: string; entry_date?: string };

    const { data, error } = await supabase.from('expense').update(patch).eq('id', id).select();
    if (error) throw error;
    return NextResponse.json({ message: '更新OK', data }, { status: 200 });
  } catch (e) {
    console.error('PATCH expense error:', e);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  try {
    const idParam = new URL(request.url).searchParams.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'id が必要です' }, { status: 400 });

    const { error } = await supabase.from('expense').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ message: '削除OK' }, { status: 200 });
  } catch (e) {
    console.error('DELETE expense error:', e);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
