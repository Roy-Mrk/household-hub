import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { HouseholdInviteSchema, zodErrorToMessages } from '@/lib/validation';

// GET ?token=xxx: 招待情報を取得（参加前のプレビュー用）
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token が必要です' }, { status: 400 });

  try {
    const { data: invitation } = await supabase
      .from('household_invitations')
      .select('id, household_id, expires_at, used_at, households(name)')
      .eq('id', token)
      .maybeSingle();

    if (!invitation) return NextResponse.json({ error: '招待が見つかりません' }, { status: 404 });

    const isExpired = invitation.expires_at ? new Date(invitation.expires_at) < new Date() : false;
    const isUsed = !!invitation.used_at;

    return NextResponse.json({
      invitation: {
        household_name: (invitation.households as unknown as { name: string } | null)?.name ?? '',
        expires_at: invitation.expires_at,
        is_valid: !isExpired && !isUsed,
        is_expired: isExpired,
        is_used: isUsed,
      },
    }, { status: 200 });
  } catch (e) {
    console.error('GET invite error:', e);
    return NextResponse.json({ error: '招待情報の取得に失敗しました' }, { status: 500 });
  }
}

// POST: 招待トークンを発行（オーナーのみ）
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const json = await request.json();
    const parsed = HouseholdInviteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', issues: zodErrorToMessages(parsed.error) },
        { status: 400 }
      );
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) return NextResponse.json({ error: '世帯に所属していません' }, { status: 404 });
    if (membership.role !== 'owner') return NextResponse.json({ error: 'オーナーのみ招待できます' }, { status: 403 });

    const expiresInHours = parsed.data.expires_in_hours ?? 72;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    const { data: invitation, error } = await supabase
      .from('household_invitations')
      .insert({
        household_id: membership.household_id,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ token: invitation.id }, { status: 201 });
  } catch (e) {
    console.error('POST invite error:', e);
    return NextResponse.json({ error: '招待の作成に失敗しました' }, { status: 500 });
  }
}
