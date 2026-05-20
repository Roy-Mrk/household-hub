import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calcNextApplyDate } from '@/lib/recurringUtils';
import { logger } from '@/lib/logger';

export async function POST(): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { user, supabase } = auth;

  try {
    const today = new Date().toISOString().slice(0, 10);

    // 今日以前に適用日が来ている有効なエントリを取得
    const { data: dues, error: fetchError } = await supabase
      .from('recurring_entries')
      .select('*')
      .eq('is_active', true)
      .lte('next_apply_date', today);

    if (fetchError) throw fetchError;
    if (!dues || dues.length === 0) {
      return NextResponse.json({ applied: 0 }, { status: 200 });
    }

    // 未分類IDをループ外で一度だけ取得（N+1回避）
    const miscSubIds: Record<string, string | null> = {};
    for (const type of ['income', 'expense'] as const) {
      const { data: miscCat } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('name', '未分類').eq('type', type).is('user_id', null)
        .maybeSingle();
      if (miscCat) {
        const { data: miscSub } = await supabaseAdmin
          .from('subcategories')
          .select('id')
          .eq('category_id', miscCat.id).eq('name', '未分類').is('user_id', null)
          .maybeSingle();
        miscSubIds[type] = miscSub?.id ?? null;
      } else {
        miscSubIds[type] = null;
      }
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let applied = 0;

    for (const entry of dues) {
      const table = entry.type as 'income' | 'expense';
      const nextDate = calcNextApplyDate(entry.next_apply_date, entry.frequency, entry.day_of_month);

      // next_apply_dateを先にアトミックに更新してクレームする（楽観的ロック）
      // 別リクエストが先に更新済みの場合は0件が返り、このエントリをスキップする
      const { data: claimed, error: claimError } = await supabase
        .from('recurring_entries')
        .update({ next_apply_date: nextDate })
        .eq('id', entry.id)
        .eq('next_apply_date', entry.next_apply_date)
        .select('id');

      if (claimError) {
        logger.error('繰り返しエントリのクレームに失敗', { error: claimError, entryId: entry.id });
        continue;
      }
      if (!claimed || claimed.length === 0) {
        // 別リクエストがすでにクレーム済み → スキップ
        continue;
      }

      // クレーム成功後にエントリを挿入
      const subcategoryId = entry.subcategory_id ?? miscSubIds[table] ?? null;
      const { error: insertError } = await supabase
        .from(table)
        .insert([{
          source: entry.source,
          amount: entry.amount,
          subcategory_id: subcategoryId,
          entry_date: entry.next_apply_date,
          owner: entry.owner,
          needs_settlement: entry.needs_settlement,
          user_id: user.id,
          household_id: membership?.household_id ?? null,
        }]);

      if (insertError) {
        logger.error('繰り返しエントリの挿入に失敗', { error: insertError, entryId: entry.id });
        continue;
      }

      applied += 1;
    }

    return NextResponse.json({ applied }, { status: 200 });
  } catch (error) {
    logger.error('POST recurring/apply error', { error });
    return NextResponse.json({ error: '適用に失敗しました' }, { status: 500 });
  }
}
