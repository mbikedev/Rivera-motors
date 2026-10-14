import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { default: 'Verwaltung', template: '%s | Verwaltung' },
  robots: { index: false, follow: false },
};

// The admin area is always rendered per request with the signed-in session.
export const dynamic = 'force-dynamic';

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="bg-muted/40 min-h-screen">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
