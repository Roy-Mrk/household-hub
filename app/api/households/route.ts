import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { HouseholdCreateSchema, zodErrorToMessages } from '@/lib/validation';

// GET: 自分の世帯情報を取得
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id, role, joined_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) return NextResponse.json({ household: null }, { status: 200 });

    const { data: household } = await supabase
      .from('households')
      .select('id, name, created_by, created_at')
      .eq('id', membership.household_id)
      .single();

    const { data: members } = await supabase
      .from('household_members')
      .select('user_id, role, joined_at')
      .eq('household_id', membership.household_id);

    // メンバーのメールアドレスを管理クライアントで取得
    const membersWithEmail = await Promise.all(
      (members ?? []).map(async (m) => {
        const { data: { user: u } } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
        return { ...m, email: u?.email ?? '' };
      })
    );

    return NextResponse.json({
      household: { ...household, role: membership.role, members: membersWithEmail },
    }, { status: 200 });
  } catch (e) {
    console.error('GET households error:', e);
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
  }
}

// POST: 世帯を新規作成（すでに世帯に所属している場合はエラー）
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const json = await request.json();
    const parsed = HouseholdCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', issues: zodErrorToMessages(parsed.error) },
        { status: 400 }
      );
    }

    // すでに世帯に所属していないか確認
    const { data: existing } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'すでに世帯に所属しています' }, { status: 409 });
    }

    // 世帯作成（admin: INSERT後のSELECTがRLSでブロックされるのを回避）
    const { data: household, error: hError } = await supabaseAdmin
      .from('households')
      .insert({ name: parsed.data.name, created_by: user.id })
      .select()
      .single();

    if (hError) throw hError;

    // オーナーとして追加
    const { error: mError } = await supabaseAdmin
      .from('household_members')
      .insert({ household_id: household.id, user_id: user.id, role: 'owner' });

    if (mError) throw mError;

    return NextResponse.json({ household }, { status: 201 });
  } catch (e) {
    console.error('POST households error:', e);
    return NextResponse.json({ error: '世帯の作成に失敗しました' }, { status: 500 });
  }
}

// DELETE: 世帯を解散（オーナーのみ）
export async function DELETE() {
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
    if (membership.role !== 'owner') return NextResponse.json({ error: 'オーナーのみ解散できます' }, { status: 403 });

    // households を削除するとカスケードで members/invitations も削除される
    const { error } = await supabase
      .from('households')
      .delete()
      .eq('id', membership.household_id);

    if (error) throw error;

    return NextResponse.json({ message: '世帯を解散しました' }, { status: 200 });
  } catch (e) {
    console.error('DELETE households error:', e);
    return NextResponse.json({ error: '世帯の解散に失敗しました' }, { status: 500 });
  }
}
