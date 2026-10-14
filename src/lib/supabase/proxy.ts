import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env, isSupabaseConfigured } from '@/lib/env';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/auth/callback'];

/**
 * Refreshes the Supabase session cookie for admin routes and redirects anonymous users
 * to the login page. Authorisation (admin profile) is checked again in the admin layout
 * and in every server action – this is only the first gate.
 */
export async function handleAdminRequest(request: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!data.user && !isPublicAdminPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    if (pathname !== '/admin') url.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
