import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { isSupabaseConfigured } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';

export interface AdminContext {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  userId: string;
  email: string | null;
  displayName: string | null;
  role: 'owner' | 'editor';
}

/** Returns the signed-in administrator, or null (not signed in / no admin profile / not configured). */
export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('role, display_name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) return null;
  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    displayName: profile.display_name,
    role: profile.role === 'owner' ? 'owner' : 'editor',
  };
});

/** For admin pages: redirects to the login page unless the user is an administrator. */
export async function requireAdminPage(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) redirect('/admin/login');
  return ctx;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized');
  }
}

/** For server actions: throws unless the caller is an administrator. RLS enforces the same rule in the database. */
export async function requireAdminAction(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) throw new UnauthorizedError();
  return ctx;
}
