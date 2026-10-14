import Link from 'next/link';

// Fallback for requests that never reach a localized route (the proxy normally prefixes the locale).
export default function GlobalNotFound() {
  return (
    <html lang="de">
      <body className="flex min-h-screen items-center justify-center p-6 font-sans">
        <main className="space-y-4 text-center">
          <h1 className="text-2xl font-bold">Seite nicht gefunden · Page not found · Page introuvable</h1>
          <Link href="/de" className="underline">
            Startseite
          </Link>
        </main>
      </body>
    </html>
  );
}
