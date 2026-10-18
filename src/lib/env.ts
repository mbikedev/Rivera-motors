/**
 * Public configuration. NEXT_PUBLIC_* values are inlined at build time.
 * The Supabase service-role key is intentionally not read anywhere in the app.
 */
export const env = {
  supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, ''),
  // Supabase now calls this the "publishable key"; both names are accepted.
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || 'http://localhost:3000').replace(/\/$/, ''),
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
