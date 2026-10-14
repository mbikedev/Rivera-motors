import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { isLocale, LOCALE_COOKIE } from '@/i18n/locales';
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { handleAdminRequest } from '@/lib/supabase/proxy';

const intlMiddleware = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return handleAdminRequest(request);
  }

  // "/" opens in German unless the visitor explicitly chose another language before.
  if (pathname === '/') {
    const preferred = request.cookies.get(LOCALE_COOKIE)?.value;
    if (isLocale(preferred) && preferred !== routing.defaultLocale) {
      const url = request.nextUrl.clone();
      url.pathname = getPathname({ locale: preferred, href: '/' });
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Everything except API routes, Next.js internals, Netlify internals and files with an extension.
  matcher: ['/((?!api|_next|_vercel|\\.netlify|.*\\..*).*)'],
};
