// app/api/expense/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const from = searchParams.get('from'); // YYYY-MM-DD
    const to = searchParams.get('to');     // YYYY-MM-DD
    const limit = Number(searchParams.get('limit') ?? 50);
    const offset = Number(searchParams.get('offset') ?? 0);

    let query = supabaseAdmin.from('expense').select('*', { count: 'exact' });

    if (q) query = query.ilike('source', `%${q}%`);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query
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
  try {
    const body = (await request.json()) as { source?: string; amount?: number | string };
    const source = body.source ?? '';
    const n = Number(body.amount);
    if (!source || !Number.isFinite(n)) {
      return NextResponse.json({ error: '支出の内容と数値の金額が必要です' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('expense')
      .insert([{ source, amount: n }])
      .select();

    if (error) throw error;
    return NextResponse.json({ message: '作成OK', data }, { status: 200 });
  } catch (e) {
    console.error('POST expense error:', e);
    return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: number; source?: string; amount?: number | string };
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'id が必要です' }, { status: 400 });

    const patch: Partial<{ source: string; amount: number }> = {};
    if (typeof body.source === 'string') patch.source = body.source;
    if (body.amount !== undefined) {
      const n = Number(body.amount);
      if (!Number.isFinite(n)) return NextResponse.json({ error: '金額は数値' }, { status: 400 });
      patch.amount = n;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: '更新内容がありません' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
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
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'id が必要です' }, { status: 400 });

    const { error } = await supabaseAdmin.from('expense').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ message: '削除OK' }, { status: 200 });
  } catch (e) {
    console.error('DELETE expense error:', e);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}