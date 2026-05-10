import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/settlement/[id] — 精算詳細（対象明細の内容含む）
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  const { id } = await params;

  try {
    const { data: settlement, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !settlement) return NextResponse.json({ error: '見つかりません' }, { status: 404 });

    const { data: settlementItems } = await supabase
      .from('settlement_items')
      .select('item_type, item_id')
      .eq('settlement_id', id);

    const items = settlementItems ?? [];
    const expenseIds = items.filter(i => i.item_type === 'expense').map(i => i.item_id);
    const incomeIds  = items.filter(i => i.item_type === 'income').map(i => i.item_id);

    const enrichedItems: {
      item_type: 'income' | 'expense';
      item_id: number;
      source: string;
      amount: number;
      entry_date: string;
      user_id: string;
    }[] = [];

    if (expenseIds.length > 0) {
      const { data: expenses } = await supabaseAdmin
        .from('expense')
        .select('id, source, amount, entry_date, user_id')
        .in('id', expenseIds);
      for (const e of expenses ?? []) {
        enrichedItems.push({ item_type: 'expense', item_id: e.id, source: e.source, amount: Number(e.amount), entry_date: e.entry_date, user_id: e.user_id });
      }
    }
    if (incomeIds.length > 0) {
      const { data: incomes } = await supabaseAdmin
        .from('income')
        .select('id, source, amount, entry_date, user_id')
        .in('id', incomeIds);
      for (const i of incomes ?? []) {
        enrichedItems.push({ item_type: 'income', item_id: i.id, source: i.source, amount: Number(i.amount), entry_date: i.entry_date, user_id: i.user_id });
      }
    }

    // entry_date 降順でソート
    enrichedItems.sort((a, b) => b.entry_date.localeCompare(a.entry_date));

    // split_ratios のメンバーにアバター URL を付与
    const enrichedRatios = await Promise.all(
      (settlement.split_ratios as { user_id: string; display_name: string; ratio: number }[]).map(async r => {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
        const avatarUrl = (user?.user_metadata as { avatar_url?: string } | null)?.avatar_url ?? null;
        return { ...r, avatar_url: avatarUrl };
      })
    );

    return NextResponse.json({ data: { ...settlement, split_ratios: enrichedRatios, items: enrichedItems } });
  } catch (e) {
    console.error('GET settlement/[id] error:', e);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}

// PATCH /api/settlement/[id] — 精算をキャンセルする
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  const { id } = await params;

  try {
    const { data: settlement, error: fetchErr } = await supabase
      .from('settlements')
      .select('id, cancelled_at')
      .eq('id', id)
      .single();
    if (fetchErr || !settlement) return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    if (settlement.cancelled_at) return NextResponse.json({ error: 'すでにキャンセル済みです' }, { status: 409 });

    // settlement_items から対象明細を取得
    const { data: items } = await supabase
      .from('settlement_items')
      .select('item_type, item_id')
      .eq('settlement_id', id);

    const expenseIds = (items ?? []).filter(i => i.item_type === 'expense').map(i => i.item_id);
    const incomeIds  = (items ?? []).filter(i => i.item_type === 'income').map(i => i.item_id);

    // 対象明細の needs_settlement を true に戻す
    if (expenseIds.length > 0) {
      await supabaseAdmin.from('expense').update({ needs_settlement: true }).in('id', expenseIds);
    }
    if (incomeIds.length > 0) {
      await supabaseAdmin.from('income').update({ needs_settlement: true }).in('id', incomeIds);
    }

    // cancelled_at をセット
    const { error: updateErr } = await supabase
      .from('settlements')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ message: 'キャンセルOK' });
  } catch (e) {
    console.error('PATCH settlement/[id] error:', e);
    return NextResponse.json({ error: 'キャンセルに失敗しました' }, { status: 500 });
  }
}
