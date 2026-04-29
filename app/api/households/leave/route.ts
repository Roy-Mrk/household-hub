import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

// POST: 世帯から退出（メンバーのみ。オーナーは /api/households DELETE で解散）
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) return NextResponse.json({ error: '世帯に所属していません' }, { status: 404 });
    if (membership.role === 'owner') {
      return NextResponse.json(
        { error: 'オーナーは退出できません。世帯を解散する場合は「世帯を解散」を使用してください' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ message: '世帯から退出しました' }, { status: 200 });
  } catch (e) {
    console.error('POST leave error:', e);
    return NextResponse.json({ error: '退出に失敗しました' }, { status: 500 });
  }
}
