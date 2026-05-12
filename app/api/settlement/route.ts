import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { SplitRatio, Payment, SettlementItem } from '@/lib/settlementCalc';
import { calcPayments } from '@/lib/settlementCalc';
import { logger } from '@/lib/logger';

// GET /api/settlement — 自世帯の精算履歴一覧
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { user, supabase } = auth;

  const sp = new URL(req.url).searchParams;
  const limit  = Math.max(1, Number(sp.get('limit')  ?? 20));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));

  try {
    const { data: membership } = await supabase
      .from('household_members').select('household_id').eq('user_id', user.id).maybeSingle();
    if (!membership) return NextResponse.json({ error: '世帯に所属していません' }, { status: 404 });

    const { data, error, count } = await supabase
      .from('settlements')
      .select('*', { count: 'exact' })
      .eq('household_id', membership.household_id)
      .order('settled_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({ data, count, limit, offset });
  } catch (e) {
    logger.error('GET settlement error:', e);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}

// POST /api/settlement — 精算を確定する
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { user, supabase } = auth;

  try {
    const body = await request.json() as {
      split_ratios: SplitRatio[];
      items: { item_type: 'income' | 'expense'; item_id: number }[];
    };

    const { split_ratios, items } = body;

    // バリデーション
    if (!Array.isArray(split_ratios) || split_ratios.length < 2) {
      return NextResponse.json({ error: 'split_ratios は2名以上必要です' }, { status: 400 });
    }
    const ratioSum = split_ratios.reduce((s, r) => s + r.ratio, 0);
    if (ratioSum !== 100) {
      return NextResponse.json({ error: '分担割合の合計が100になっていません' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: '精算対象の明細がありません' }, { status: 400 });
    }

    // 世帯確認
    const { data: membership } = await supabase
      .from('household_members').select('household_id').eq('user_id', user.id).maybeSingle();
    if (!membership) return NextResponse.json({ error: '世帯に所属していません' }, { status: 404 });

    // 対象明細の金額を取得して計算
    const expenseIds = items.filter(i => i.item_type === 'expense').map(i => i.item_id);
    const incomeIds  = items.filter(i => i.item_type === 'income').map(i => i.item_id);

    const settlementItems: SettlementItem[] = [];

    if (expenseIds.length > 0) {
      const { data: expenses } = await supabaseAdmin
        .from('expense').select('id, user_id, amount').in('id', expenseIds);
      for (const e of expenses ?? []) {
        settlementItems.push({ item_type: 'expense', item_id: e.id, user_id: e.user_id, amount: Number(e.amount) });
      }
    }
    if (incomeIds.length > 0) {
      const { data: incomes } = await supabaseAdmin
        .from('income').select('id, user_id, amount').in('id', incomeIds);
      for (const i of incomes ?? []) {
        settlementItems.push({ item_type: 'income', item_id: i.id, user_id: i.user_id, amount: Number(i.amount) });
      }
    }

    const { totalAmount, payments } = calcPayments(settlementItems, split_ratios);

    // settlements レコード挿入
    const { data: settlement, error: sErr } = await supabase
      .from('settlements')
      .insert([{
        household_id: membership.household_id,
        split_ratios,
        total_amount: totalAmount,
        payments,
      }])
      .select()
      .single();
    if (sErr) throw sErr;

    // settlement_items 挿入
    if (items.length > 0) {
      const { error: siErr } = await supabase
        .from('settlement_items')
        .insert(items.map(i => ({ settlement_id: settlement.id, item_type: i.item_type, item_id: i.item_id })));
      if (siErr) throw siErr;
    }

    // 対象明細の needs_settlement を false に更新
    if (expenseIds.length > 0) {
      await supabaseAdmin.from('expense').update({ needs_settlement: false }).in('id', expenseIds);
    }
    if (incomeIds.length > 0) {
      await supabaseAdmin.from('income').update({ needs_settlement: false }).in('id', incomeIds);
    }

    return NextResponse.json({ message: '精算OK', data: settlement }, { status: 200 });
  } catch (e) {
    logger.error('POST settlement error:', e);
    return NextResponse.json({ error: '精算に失敗しました' }, { status: 500 });
  }
}
