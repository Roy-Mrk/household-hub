// app/api/income/route.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { NextResponse } from 'next/server';

// GET: 一覧取得（クエリ: q, from, to, limit, offset）
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';       // 部分一致フィルタ（source）
    const from = searchParams.get('from');       // 例: 2025-08-01
    const to = searchParams.get('to');           // 例: 2025-08-31
    const limit = Number(searchParams.get('limit') || 50);
    const offset = Number(searchParams.get('offset') || 0);

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
export async function POST(request) {
  try {
    const { source, amount } = await request.json();
    const n = Number(amount);
    if (!source || !Number.isFinite(n)) {
      return NextResponse.json({ error: '収入の内容と数値の金額が必要です' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from('income')
      .insert([{ source, amount: n }])
      .select();
    if (error) throw error;
    return NextResponse.json({ message: '作成OK', data }, { status: 200 });
  } catch (error) {
    console.error('POST income error:', error);
    return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
  }
}

// PATCH: 更新（id 必須）
export async function PATCH(request) {
  try {
    const { id, source, amount } = await request.json();
    if (!id) return NextResponse.json({ error: 'id が必要です' }, { status: 400 });

    const patch = {};
    if (typeof source === 'string') patch.source = source;
    if (amount !== undefined) {
      const n = Number(amount);
      if (!Number.isFinite(n)) return NextResponse.json({ error: '金額は数値' }, { status: 400 });
      patch.amount = n;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: '更新内容がありません' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('income')
      .update(patch)
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
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'id が必要です' }, { status: 400 });

    const { error } = await supabaseAdmin.from('income').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ message: '削除OK' }, { status: 200 });
  } catch (error) {
    console.error('DELETE income error:', error);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}