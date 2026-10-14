import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

let client: SupabaseClient | null = null;

/**
 * Anonymous, cookie-less client for public catalogue reads on the server.
 * RLS restricts it to published vehicles; it never carries a user session,
 * so public pages stay cacheable.
 */
export function getPublicSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
