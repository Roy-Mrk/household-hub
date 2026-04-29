// app/api/expense/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { ExpenseCreateSchema, ExpenseUpdateSchema } from '@/lib/validation/expense';
import { zodErrorToMessages } from '@/lib/validation/common';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const from = searchParams.get('from'); // YYYY-MM-DD
    const to = searchParams.get('to');     // YYYY-MM-DD
    const limit = Number(searchParams.get('limit') ?? 50);
    const offset = Number(searchParams.get('offset') ?? 0);

    let query = supabase.from('expense').select('*', { count: 'exact' });

    if (q) query = query.ilike('source', `%${q}%`);
    if (from) query = query.gte('entry_date', from);
    if (to) query = query.lte('entry_date', to);

    const { data, error, count } = await query
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({ data, count, limit, offset }, { status: 200 });
  } catch (e) {
    console.error('GET expense error:', e);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

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
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

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

    const { data, error } = await supabase
      .from('expense')
      .update(patch)
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json({ message: '更新OK', data }, { status: 200 });
  } catch (e) {
    console.error('PATCH expense error:', e);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
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
