// app/api/income/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET: 一覧取得（クエリ: q, from, to, limit, offset）
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const from = searchParams.get('from'); // YYYY-MM-DD
    const to = searchParams.get('to');     // YYYY-MM-DD
    const limit = Number(searchParams.get('limit') ?? 50);
    const offset = Number(searchParams.get('offset') ?? 0);

    let query = supabaseAdmin.from('income').select('*', { count: 'exact' });

    if (q) query = query.ilike('source', `%${q}%`);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({ data, count, limit, offset }, { status: 200 });
  } catch (error) {
    console.error('GET income error:', error);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}

// POST: 新規作成
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = IncomeCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', issues: zodErrorToMessages(parsed.error) }, { status: 400 });
    }
    const { source, amount } = parsed.data;

    const { data, error } = await supabaseAdmin
      .from('income')
      .insert([{ source, amount }])
      .select();

    if (error) throw error;
    return NextResponse.json({ message: '作成OK', data }, { status: 200 });
  } catch (error) {
    console.error('POST income error:', error);
    return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
  }
}

// PATCH: 更新
export async function PATCH(request: Request) {
  try {
    const json = await request.json();
    const parsed = IncomeUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', issues: zodErrorToMessages(parsed.error) }, { status: 400 });
    }
    const { id, ...rest } = parsed.data;

    const { data, error } = await supabaseAdmin
      .from('income')
      .update(rest)
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json({ message: '更新OK', data }, { status: 200 });
  } catch (error) {
    console.error('PATCH income error:', error);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}

// DELETE: 削除（id 必須）
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const id = idParam ? Number(idParam) : NaN;

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'id が必要です' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('income').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ message: '削除OK' }, { status: 200 });
  } catch (error) {
    console.error('DELETE income error:', error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}