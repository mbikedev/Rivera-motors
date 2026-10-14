'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ADMIN_LOCALE_COOKIE, isLocale } from '@/i18n/locales';
import { MEDIA_BUCKET, VEHICLE_STATUSES } from '@/lib/data/constants';
import { SETTINGS_KEYS } from '@/lib/data/settings-keys';
import { env, isSupabaseConfigured } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';
import { settingsSchema } from '@/lib/validation/settings';
import { toSavePayload, vehicleFormSchema } from '@/lib/validation/vehicle';
import { getAdminContext, requireAdminAction, UnauthorizedError } from './auth';

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fail(
  error: string,
  fieldErrors?: Record<string, string>,
): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  return { ok: false, error, fieldErrors };
}

function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) return fail('unauthorized');
  console.error(error);
  return fail('generic');
}

/** Public pages are cached (ISR); refresh them after every change. */
function revalidatePublic() {
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Authentication (administrators only – there is no sign-up)
// ---------------------------------------------------------------------------

export async function signInAction(_: unknown, formData: FormData): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) return { error: 'error' };
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1).max(200), next: z.string().optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'invalid' };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: 'invalid' };

  const ctx = await getAdminContext();
  if (!ctx) {
    await supabase.auth.signOut();
    return { error: 'noAccess' };
  }
  const next = parsed.data.next && parsed.data.next.startsWith('/admin') ? parsed.data.next : '/admin';
  redirect(next);
}

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect('/admin/login');
}

export async function requestPasswordResetAction(_: unknown, formData: FormData): Promise<{ sent?: boolean }> {
  const email = z.email().safeParse(formData.get('email'));
  if (isSupabaseConfigured && email.success) {
    const supabase = await createServerSupabase();
    const origin = env.siteUrl || (await headers()).get('origin') || '';
    await supabase.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${origin}/admin/auth/callback?next=/admin/reset-password`,
    });
  }
  // Always the same answer, so the form does not reveal which accounts exist.
  return { sent: true };
}

export async function updatePasswordAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; done?: boolean }> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 12) return { error: 'tooShort' };
  if (password !== confirm) return { error: 'mismatch' };
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: 'invalidLink' };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'invalidLink' };
  return { done: true };
}

export async function setAdminLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(ADMIN_LOCALE_COOKIE, locale, {
    path: '/admin',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  revalidatePath('/admin', 'layout');
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function saveVehicleAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireAdminAction();
    const parsed = vehicleFormSchema.safeParse(input);
    if (!parsed.success) return fail('errorFields', zodFieldErrors(parsed.error));

    const { data, error } = await supabase.rpc('save_vehicle', { p: toSavePayload(parsed.data) });
    if (error) {
      if (error.code === '23505') return fail('errorSlugTaken', { slug: 'errorSlugTaken' });
      if (error.hint === 'missing_german_content') return fail('missingGerman');
      console.error('save_vehicle failed', error);
      return fail('errorGeneric');
    }
    revalidatePublic();
    revalidatePath('/admin', 'layout');
    return { ok: true, data: { id: data as string } };
  } catch (error) {
    return handleError(error);
  }
}

const idSchema = z.uuid();

export async function setVehicleStatusAction(id: string, status: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const parsedId = idSchema.parse(id);
    const parsedStatus = z.enum(VEHICLE_STATUSES).parse(status);
    const { error } = await supabase.from('vehicles').update({ status: parsedStatus }).eq('id', parsedId);
    if (error) {
      if (error.hint === 'missing_german_content') return fail('missingGerman');
      console.error('status update failed', error);
      return fail('generic');
    }
    revalidatePublic();
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function duplicateVehicleAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireAdminAction();
    const { data, error } = await supabase.rpc('duplicate_vehicle', { p_source: idSchema.parse(id) });
    if (error) {
      console.error('duplicate failed', error);
      return fail('generic');
    }
    revalidatePath('/admin', 'layout');
    return { ok: true, data: { id: data as string } };
  } catch (error) {
    return handleError(error);
  }
}

/** Only drafts can be deleted; published vehicles are marked sold/withdrawn to keep their history. */
export async function deleteVehicleAction(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const vehicleId = idSchema.parse(id);
    const { data: vehicle } = await supabase.from('vehicles').select('status').eq('id', vehicleId).maybeSingle();
    if (!vehicle) return fail('notFound');
    if (vehicle.status !== 'draft') return fail('deleteOnlyDrafts');

    const { data: media } = await supabase.from('vehicle_media').select('storage_path').eq('vehicle_id', vehicleId);
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
    if (error) return fail('generic');
    const paths = (media ?? []).map((m) => m.storage_path as string).filter((p) => !p.startsWith('/'));
    if (paths.length) await supabase.storage.from(MEDIA_BUCKET).remove(paths);
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

const addMediaSchema = z.object({
  vehicleId: z.uuid(),
  storagePath: z.string().max(500),
  mediaType: z.enum(['image', 'video']),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  altText: z.string().max(300).optional(),
});

export async function addMediaAction(input: z.input<typeof addMediaSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireAdminAction();
    const m = addMediaSchema.parse(input);
    // The upload path must belong to this vehicle and follow "<vehicle_id>/<uuid>.<ext>".
    if (!new RegExp(`^${m.vehicleId}/[0-9a-f-]{36}\\.(webp|jpg|jpeg|png|avif|mp4|webm)$`).test(m.storagePath)) {
      return fail('generic');
    }
    const { data: existing } = await supabase
      .from('vehicle_media')
      .select('id,is_primary,sort_order')
      .eq('vehicle_id', m.vehicleId);
    const rows = existing ?? [];
    const { data, error } = await supabase
      .from('vehicle_media')
      .insert({
        vehicle_id: m.vehicleId,
        storage_path: m.storagePath,
        media_type: m.mediaType,
        width: m.width ?? null,
        height: m.height ?? null,
        alt_text: m.altText || null,
        is_primary: m.mediaType === 'image' && !rows.some((r) => r.is_primary),
        sort_order: rows.reduce((max, r) => Math.max(max, (r.sort_order as number) + 1), 0),
      })
      .select('id')
      .single();
    if (error) {
      console.error('media insert failed', error);
      return fail('generic');
    }
    revalidatePublic();
    return { ok: true, data: { id: data.id as string } };
  } catch (error) {
    return handleError(error);
  }
}

const updateMediaSchema = z.object({
  id: z.uuid(),
  altText: z.string().trim().max(300),
  caption: z.string().trim().max(300),
  isDamageView: z.boolean(),
});

export async function updateMediaAction(input: z.input<typeof updateMediaSchema>): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const m = updateMediaSchema.parse(input);
    const { error } = await supabase
      .from('vehicle_media')
      .update({ alt_text: m.altText || null, caption: m.caption || null, is_damage_view: m.isDamageView })
      .eq('id', m.id);
    if (error) return fail('generic');
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const mediaId = idSchema.parse(id);
    const { data: media } = await supabase
      .from('vehicle_media')
      .select('vehicle_id,storage_path,is_primary')
      .eq('id', mediaId)
      .maybeSingle();
    if (!media) return fail('notFound');
    const { error } = await supabase.from('vehicle_media').delete().eq('id', mediaId);
    if (error) return fail('generic');
    if (!String(media.storage_path).startsWith('/')) {
      await supabase.storage.from(MEDIA_BUCKET).remove([media.storage_path as string]);
    }
    if (media.is_primary) {
      // Promote the next image so the vehicle keeps a main photo.
      const { data: next } = await supabase
        .from('vehicle_media')
        .select('id')
        .eq('vehicle_id', media.vehicle_id)
        .eq('media_type', 'image')
        .order('sort_order')
        .limit(1)
        .maybeSingle();
      if (next) await supabase.rpc('set_primary_media', { p_media_id: next.id });
    }
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function setPrimaryMediaAction(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.rpc('set_primary_media', { p_media_id: idSchema.parse(id) });
    if (error) return fail('generic');
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function reorderMediaAction(vehicleId: string, ids: string[]): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.rpc('reorder_media', {
      p_vehicle_id: idSchema.parse(vehicleId),
      p_ids: z.array(z.uuid()).max(200).parse(ids),
    });
    if (error) return fail('generic');
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

// ---------------------------------------------------------------------------
// Settings, contact messages
// ---------------------------------------------------------------------------

export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return fail('errorFields', zodFieldErrors(parsed.error));
    const rows = SETTINGS_KEYS.map((key) => ({ key, value: parsed.data[key] }));
    const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
    if (error) {
      console.error('settings save failed', error);
      return fail('generic');
    }
    revalidatePublic();
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteContactMessageAction(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.from('contact_messages').delete().eq('id', idSchema.parse(id));
    if (error) return fail('generic');
    revalidatePath('/admin/messages');
    return { ok: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function purgeContactMessagesAction(): Promise<ActionResult<{ count: number }>> {
  try {
    const { supabase } = await requireAdminAction();
    const { data, error } = await supabase.rpc('purge_old_contact_messages');
    if (error) return fail('generic');
    revalidatePath('/admin/messages');
    return { ok: true, data: { count: Number(data ?? 0) } };
  } catch (error) {
    return handleError(error);
  }
}
