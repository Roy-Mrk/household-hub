import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import type { SupabaseClient, User } from '@supabase/supabase-js';

type AuthSuccess = { user: User; supabase: SupabaseClient; errorResponse: null };
type AuthFailure = { user: null; supabase: null; errorResponse: NextResponse };

export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      supabase: null,
      errorResponse: NextResponse.json({ error: '認証が必要です' }, { status: 401 }),
    };
  }
  return { user, supabase, errorResponse: null };
}

export function parseListParams(searchParams: URLSearchParams) {
  return {
    q: searchParams.get('q') ?? '',
    from: searchParams.get('from') ?? null,
    to: searchParams.get('to') ?? null,
    limit: Math.max(1, Number(searchParams.get('limit') ?? 50)),
    offset: Math.max(0, Number(searchParams.get('offset') ?? 0)),
  };
}
