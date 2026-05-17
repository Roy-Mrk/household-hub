import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { RecurringCreateSchema, RecurringUpdateSchema, zodErrorToMessages } from '@/lib/validation';
import { calcInitialNextApplyDate } from '@/lib/recurringUtils';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  try {
    const onlyActive = new URL(req.url).searchParams.get('active') === '1';
    let query = supabase
      .from('recurring_entries')
      .select('*, subcategory:subcategory_id(name, category:category_id(name))')
      .order('created_at', { ascending: false });

    if (onlyActive) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    logger.error('GET recurring error', { error });
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { user, supabase } = auth;

  try {
    const json = await request.json();
    const parsed = RecurringCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', issues: zodErrorToMessages(parsed.error) }, { status: 400 });
    }

    const { type, source, amount, owner, needs_settlement, frequency, day_of_month, month_of_year } = parsed.data;
    let { subcategory_id } = parsed.data;

    if (!subcategory_id) {
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
        subcategory_id = miscSub?.id ?? undefined;
      }
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const next_apply_date = calcInitialNextApplyDate(frequency, day_of_month, month_of_year ?? null);

    const { data, error } = await supabase
      .from('recurring_entries')
      .insert([{
        user_id: user.id,
        household_id: membership?.household_id ?? null,
        type, source, amount,
        subcategory_id: subcategory_id ?? null,
        owner, needs_settlement,
        frequency, day_of_month,
        month_of_year: month_of_year ?? null,
        next_apply_date,
      }])
      .select();

    if (error) throw error;
    return NextResponse.json({ message: '作成OK', data }, { status: 200 });
  } catch (error) {
    logger.error('POST recurring error', { error });
    return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  try {
    const json = await request.json();
    const parsed = RecurringUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', issues: zodErrorToMessages(parsed.error) }, { status: 400 });
    }
    const { id, ...rest } = parsed.data;

    // 頻度や日付が変わった場合は次回適用日を再計算
    if (rest.frequency || rest.day_of_month) {
      const { data: existing } = await supabase
        .from('recurring_entries')
        .select('frequency, day_of_month, month_of_year, next_apply_date')
        .eq('id', id)
        .single();

      if (existing) {
        const frequency = (rest.frequency ?? existing.frequency) as 'monthly' | 'yearly';
        const dayOfMonth = rest.day_of_month ?? existing.day_of_month;
        const monthOfYear = rest.month_of_year !== undefined ? rest.month_of_year : existing.month_of_year;
        (rest as Record<string, unknown>).next_apply_date = calcInitialNextApplyDate(frequency, dayOfMonth, monthOfYear);
      }
    }

    const { data, error } = await supabase
      .from('recurring_entries')
      .update(rest)
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json({ message: '更新OK', data }, { status: 200 });
  } catch (error) {
    logger.error('PATCH recurring error', { error });
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth.errorResponse) return auth.errorResponse;
  const { supabase } = auth;

  try {
    const idParam = new URL(request.url).searchParams.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'id が必要です' }, { status: 400 });

    const { error } = await supabase.from('recurring_entries').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ message: '削除OK' }, { status: 200 });
  } catch (error) {
    logger.error('DELETE recurring error', { error });
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
