import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { HouseholdJoinSchema, zodErrorToMessages } from '@/lib/validation';

// POST: 招待トークンで世帯に参加
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const json = await request.json();
    const parsed = HouseholdJoinSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', issues: zodErrorToMessages(parsed.error) },
        { status: 400 }
      );
    }

    // 招待を検証（admin: used_at更新のためRLSをバイパス）
    const { data: invitation } = await supabaseAdmin
      .from('household_invitations')
      .select('id, household_id, expires_at, used_at, households(name)')
      .eq('id', parsed.data.token)
      .maybeSingle();

    if (!invitation) return NextResponse.json({ error: '招待が見つかりません' }, { status: 404 });
    if (invitation.used_at) return NextResponse.json({ error: 'この招待はすでに使用済みです' }, { status: 409 });
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: '招待の有効期限が切れています' }, { status: 410 });
    }

    // すでに世帯に所属していないか確認
    const { data: existing } = await supabaseAdmin
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) return NextResponse.json({ error: 'すでに世帯に所属しています' }, { status: 409 });

    // 世帯に参加
    const { error: mError } = await supabaseAdmin
      .from('household_members')
      .insert({ household_id: invitation.household_id, user_id: user.id, role: 'member' });

    if (mError) throw mError;

    // 招待を使用済みにする
    await supabaseAdmin
      .from('household_invitations')
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq('id', parsed.data.token);

    const householdName = (invitation.households as unknown as { name: string } | null)?.name ?? '';
    return NextResponse.json(
      { message: '参加しました', household: { id: invitation.household_id, name: householdName } },
      { status: 200 }
    );
  } catch (e) {
    console.error('POST join error:', e);
    return NextResponse.json({ error: '参加に失敗しました' }, { status: 500 });
  }
}
