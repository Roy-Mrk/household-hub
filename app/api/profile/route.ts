import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ProfileUpdateSchema, zodErrorToMessages } from '@/lib/validation';

// GET: 自分のプロフィールを取得
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ profile }, { status: 200 });
}

// PATCH: 表示名を更新（世帯内重複チェックあり）
export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const json = await request.json();
    const parsed = ProfileUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', issues: zodErrorToMessages(parsed.error) },
        { status: 400 }
      );
    }
    const { display_name } = parsed.data;

    // 世帯に所属している場合、同じ世帯内での重複チェック
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership?.household_id) {
      // 同じ世帯の他メンバーの表示名を取得（admin: profiles は全件参照できるが household_members の RLS をバイパス）
      const { data: otherMembers } = await supabaseAdmin
        .from('household_members')
        .select('user_id')
        .eq('household_id', membership.household_id)
        .neq('user_id', user.id);

      if (otherMembers && otherMembers.length > 0) {
        const otherUserIds = otherMembers.map(m => m.user_id);
        const { data: conflicting } = await supabase
          .from('profiles')
          .select('display_name')
          .in('user_id', otherUserIds)
          .eq('display_name', display_name)
          .maybeSingle();

        if (conflicting) {
          return NextResponse.json(
            { error: 'この表示名はすでに同じ世帯のメンバーが使用しています' },
            { status: 409 }
          );
        }
      }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, display_name })
      .select('display_name')
      .single();

    if (error) throw error;
    return NextResponse.json({ profile }, { status: 200 });
  } catch (e) {
    console.error('PATCH profile error:', e);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}
