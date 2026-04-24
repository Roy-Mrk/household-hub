import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // セッション検証に失敗した場合は未認証として扱う
  }

  const isLoginPage = request.nextUrl.pathname === '/login';

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  // API routes・認証コールバック・静的ファイルはスキップ
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|auth/).*)'],
};
