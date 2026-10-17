'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

let client: SupabaseClient | null = null;

/** Browser client used only inside the admin area (photo uploads with the admin session). */
export function getBrowserSupabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return client;
}
