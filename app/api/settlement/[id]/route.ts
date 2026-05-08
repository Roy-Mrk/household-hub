import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiHelpers';

// GET /api/settlement/[id] — 精算詳細（対象明細含む）
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

    return NextResponse.json({ data: { ...settlement, items: settlementItems ?? [] } });
  } catch (e) {
    console.error('GET settlement/[id] error:', e);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}
