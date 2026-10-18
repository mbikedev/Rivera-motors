import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getPublicSupabase } from '@/lib/supabase/public';
import { contactSchema, MIN_FILL_MS } from '@/lib/validation/contact';

// Best-effort in-memory rate limit per IP (per server instance). Netlify's firewall/rate limiting
// can be added on top for stronger protection.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 20_000) return NextResponse.json({ error: 'too_large' }, { status: 413 });

  const ip =
    request.headers.get('x-nf-client-connection-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  if (rateLimited(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), i.message]));
    return NextResponse.json({ error: 'validation', fields }, { status: 422 });
  }
  const data = parsed.data;

  // Bots: pretend success so they do not retry, but store nothing.
  if (data.website || (data.startedAt && Date.now() - data.startedAt < MIN_FILL_MS)) {
    return NextResponse.json({ ok: true });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const { error } = await getPublicSupabase()
    .from('contact_messages')
    .insert({
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      message: data.message,
      vehicle_slug: data.vehicle ?? null,
      locale: data.locale,
      privacy_consent: true,
    });
  if (error) {
    console.error('contact message insert failed', error.message);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
