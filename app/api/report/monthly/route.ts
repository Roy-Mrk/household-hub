import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/apiHelpers';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  const raw = Number(new URL(req.url).searchParams.get('months') ?? 12);
  const months = Math.min(24, Math.max(1, isNaN(raw) ? 12 : raw));

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  // toISOString() は UTC 変換するためタイムゾーン依存で日付がずれる。文字列で組み立てる
  const fromDate = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`;

  try {
    const [incomeRes, expenseRes] = await Promise.all([
      supabase.from('income').select('amount, entry_date').gte('entry_date', fromDate),
      supabase.from('expense').select('amount, entry_date').gte('entry_date', fromDate),
    ]);

    if (incomeRes.error) throw incomeRes.error;
    if (expenseRes.error) throw expenseRes.error;

    // 過去 N ヶ月分のスロットをゼロ埋めで初期化
    const monthMap: Record<string, { income: number; expense: number }> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = { income: 0, expense: 0 };
    }

    for (const r of incomeRes.data ?? []) {
      const key = r.entry_date.slice(0, 7);
      if (monthMap[key]) monthMap[key].income += Number(r.amount);
    }
    for (const r of expenseRes.data ?? []) {
      const key = r.entry_date.slice(0, 7);
      if (monthMap[key]) monthMap[key].expense += Number(r.amount);
    }

    const data = Object.entries(monthMap).map(([month, { income, expense }]) => ({
      month,
      income,
      expense,
      balance: income - expense,
    }));

    return NextResponse.json({ data });
  } catch (e) {
    logger.error('GET report/monthly error', { error: e });
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}
