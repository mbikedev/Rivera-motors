import 'server-only';
import { LOCALES } from '@/i18n/locales';
import { VEHICLE_STATUSES, type VehicleStatus } from '@/lib/data/constants';
import { mapMedia } from '@/lib/data/mappers';
import type { VehicleMedia, VehicleRowWithRelations } from '@/lib/data/types';
import { emptyVehicleForm, type VehicleFormInput } from '@/lib/validation/vehicle';
import type { AdminContext } from './auth';

export async function getDashboardCounts({ supabase }: AdminContext) {
  const counts = Object.fromEntries(VEHICLE_STATUSES.map((s) => [s, 0])) as Record<VehicleStatus, number>;
  const { data, error } = await supabase.from('vehicles').select('status');
  if (error) throw new Error(error.message);
  for (const row of data ?? []) counts[row.status as VehicleStatus] += 1;
  return counts;
}

export interface AdminVehicleListItem {
  id: string;
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  status: VehicleStatus;
  updatedAt: string;
  title: string | null;
  thumbnail: VehicleMedia | null;
  mediaCount: number;
}

export async function listAdminVehicles(
  { supabase }: AdminContext,
  { q, status, limit = 200 }: { q?: string; status?: VehicleStatus; limit?: number },
): Promise<AdminVehicleListItem[]> {
  let query = supabase
    .from('vehicles')
    .select(
      'id,slug,make,model,variant,status,updated_at,vehicle_translations(locale,title),vehicle_media(storage_path,media_type,alt_text,caption,is_damage_view,is_primary,sort_order)',
    )
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (status) query = query.eq('status', status);
  if (q) {
    const safe = q.replace(/[^\p{L}\p{N}\s.\-]/gu, ' ').trim();
    if (safe)
      query = query.or(`make.ilike.%${safe}%,model.ilike.%${safe}%,variant.ilike.%${safe}%,slug.ilike.%${safe}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as VehicleRowWithRelations[]).map((row) => {
    const media = (row.vehicle_media ?? []).map(mapMedia);
    return {
      id: row.id,
      slug: row.slug,
      make: row.make,
      model: row.model,
      variant: row.variant,
      status: row.status as VehicleStatus,
      updatedAt: row.updated_at,
      title: row.vehicle_translations?.find((t) => t.locale === 'de')?.title ?? null,
      thumbnail: media.find((m) => m.isPrimary) ?? media[0] ?? null,
      mediaCount: media.length,
    };
  });
}

const FULL_SELECT =
  '*,vehicle_translations(*),vehicle_damages(*),vehicle_media(*),vehicle_private_data(vin_private,internal_notes)';

export async function getAdminVehicleRow({ supabase }: AdminContext, id: string) {
  const { data, error } = await supabase.from('vehicles').select(FULL_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as
    | (VehicleRowWithRelations & {
        vehicle_private_data: { vin_private: string | null; internal_notes: string | null } | null;
      })
    | null;
}

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/** Converts a stored vehicle into form values (strings for inputs). */
export function rowToFormValues(row: NonNullable<Awaited<ReturnType<typeof getAdminVehicleRow>>>): VehicleFormInput {
  const base = emptyVehicleForm();
  const translations = base.translations as Record<string, Record<string, string>>;
  for (const locale of LOCALES) {
    const t = row.vehicle_translations?.find((tr) => tr.locale === locale);
    if (t) {
      translations[locale] = {
        title: str(t.title),
        damage_summary: str(t.damage_summary),
        damage_details: str(t.damage_details),
        diagnosis_notes: str(t.diagnosis_notes),
        repair_notes: str(t.repair_notes),
        seo_title: str(t.seo_title),
        seo_description: str(t.seo_description),
      };
    }
  }
  const tri = (v: boolean | null) => (v === null ? '' : v ? 'true' : 'false');
  return {
    ...base,
    id: row.id,
    status: row.status as VehicleStatus,
    slug: row.slug,
    make: row.make,
    model: row.model,
    variant: str(row.variant),
    manufacture_year: str(row.manufacture_year),
    first_registration_date: str(row.first_registration_date),
    mileage_km: str(row.mileage_km),
    fuel_type: str(row.fuel_type),
    transmission: str(row.transmission),
    engine_cc: str(row.engine_cc),
    power_kw: str(row.power_kw),
    body_type: str(row.body_type),
    doors: str(row.doors),
    seats: str(row.seats),
    color: str(row.color),
    euro_standard: str(row.euro_standard),
    co2_emissions_g_km: str(row.co2_emissions_g_km),
    vin_public: str(row.vin_public),
    origin_country: str(row.origin_country),
    documents_available: str(row.documents_available),
    service_history: str(row.service_history),
    technical_inspection: str(row.technical_inspection),
    asking_price_eur: str(row.asking_price_eur),
    price_on_request: row.price_on_request,
    starts: tri(row.starts),
    drivable: tri(row.drivable),
    missing_parts: str(row.missing_parts),
    damage_assessed_at: str(row.damage_assessed_at),
    translations: translations as VehicleFormInput['translations'],
    damages: [...(row.vehicle_damages ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((d) => ({
        category: d.category as never,
        area: str(d.area),
        severity: str(d.severity),
        description: str(d.description),
        description_en: str(d.translations?.en),
        description_fr: str(d.translations?.fr),
      })),
    vin_private: str(row.vehicle_private_data?.vin_private),
    internal_notes: str(row.vehicle_private_data?.internal_notes),
  };
}

export interface AdminMedia {
  id: string;
  storagePath: string;
  url: string;
  mediaType: 'image' | 'video';
  altText: string;
  caption: string;
  isDamageView: boolean;
  isPrimary: boolean;
  sortOrder: number;
}

export function rowMedia(row: VehicleRowWithRelations): AdminMedia[] {
  return [...(row.vehicle_media ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m, i) => {
      const mapped = mapMedia(m, i);
      return {
        id: mapped.id,
        storagePath: m.storage_path,
        url: mapped.url,
        mediaType: mapped.mediaType,
        altText: m.alt_text ?? '',
        caption: m.caption ?? '',
        isDamageView: mapped.isDamageView,
        isPrimary: mapped.isPrimary,
        sortOrder: m.sort_order,
      };
    });
}

export async function listAuditLogs({ supabase }: AdminContext, limit = 200) {
  const [{ data: logs, error }, { data: profiles }] = await Promise.all([
    supabase
      .from('audit_logs')
      .select('id,actor_id,action,entity_type,entity_id,details,created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase.from('admin_profiles').select('user_id,display_name'),
  ]);
  if (error) throw new Error(error.message);
  const names = new Map((profiles ?? []).map((p) => [p.user_id as string, p.display_name as string | null]));
  return (logs ?? []).map((log) => ({
    id: log.id as string,
    actor: log.actor_id ? (names.get(log.actor_id) ?? String(log.actor_id).slice(0, 8)) : null,
    action: log.action as string,
    entityType: log.entity_type as string,
    entityId: log.entity_id as string | null,
    details: (log.details ?? {}) as Record<string, unknown>,
    createdAt: log.created_at as string,
  }));
}

export async function listContactMessages({ supabase }: AdminContext) {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('id,name,email,phone,message,vehicle_slug,locale,created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}
