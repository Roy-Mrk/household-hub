import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checkedAt = new Date().toISOString();

  try {
    // income/expense テーブルへの疎通確認
    const [incomeResult, expenseResult] = await Promise.all([
      supabaseAdmin.from('income').select('id').limit(1),
      supabaseAdmin.from('expense').select('id').limit(1),
    ]);

    if (incomeResult.error) throw new Error(`income テーブル: ${incomeResult.error.message}`);
    if (expenseResult.error) throw new Error(`expense テーブル: ${expenseResult.error.message}`);

    console.log(`[db-health] OK — ${checkedAt}`);
    return NextResponse.json({ status: 'ok', checkedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[db-health] NG — ${checkedAt}: ${message}`);
    return NextResponse.json({ status: 'error', checkedAt, message }, { status: 500 });
  }
}
