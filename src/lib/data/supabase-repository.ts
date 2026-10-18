import 'server-only';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/locales';
import { getPublicSupabase } from '@/lib/supabase/public';
import { CATALOG_PAGE_SIZE, PUBLIC_STATUSES } from './constants';
import { mapVehicle, mapVehicleSummary } from './mappers';
import type { VehicleRepository } from './repository';
import type { VehicleFilters, VehicleRowWithRelations } from './types';

/** Columns visitors may read. vin_private does not even exist on this table (see vehicle_private_data). */
const VEHICLE_COLUMNS = [
  'id',
  'slug',
  'make',
  'model',
  'variant',
  'manufacture_year',
  'first_registration_date',
  'mileage_km',
  'fuel_type',
  'transmission',
  'engine_cc',
  'power_kw',
  'body_type',
  'doors',
  'seats',
  'color',
  'euro_standard',
  'co2_emissions_g_km',
  'vin_public',
  'origin_country',
  'documents_available',
  'service_history',
  'technical_inspection',
  'asking_price_eur',
  'price_on_request',
  'starts',
  'drivable',
  'damage_summary',
  'damage_details',
  'diagnosis_notes',
  'repair_notes',
  'missing_parts',
  'damage_assessed_at',
  'damage_categories',
  'status',
  'published_at',
  'created_at',
  'updated_at',
].join(',');

const SUMMARY_COLUMNS =
  'id,slug,make,model,variant,manufacture_year,first_registration_date,mileage_km,fuel_type,transmission,body_type,power_kw,asking_price_eur,price_on_request,damage_summary,damage_categories,status,published_at,created_at,updated_at';
const TRANSLATION_COLUMNS =
  'locale,title,damage_summary,damage_details,diagnosis_notes,repair_notes,seo_title,seo_description';
const MEDIA_COLUMNS = 'id,storage_path,media_type,alt_text,caption,is_damage_view,is_primary,sort_order,width,height';
const DAMAGE_COLUMNS = 'id,category,area,severity,description,translations,sort_order';

const SUMMARY_SELECT = `${SUMMARY_COLUMNS},vehicle_translations(locale,title,damage_summary),vehicle_media(${MEDIA_COLUMNS})`;

function publicVehicles(select: string, options?: { count?: 'exact' }) {
  return getPublicSupabase()
    .from('vehicles')
    .select(select, options)
    .in('status', [...PUBLIC_STATUSES])
    .not('published_at', 'is', null);
}

type Query = ReturnType<typeof publicVehicles>;

function applyFilters(query: Query, f: VehicleFilters): Query {
  let q = query;
  if (f.q) {
    // f.q is sanitised in parseVehicleFilters (letters, digits, spaces, dots, hyphens only).
    const pattern = `%${f.q.replace(/\s+/g, '%')}%`;
    q = q.or(`make.ilike.${pattern},model.ilike.${pattern},variant.ilike.${pattern}`);
  }
  if (f.make) q = q.eq('make', f.make);
  if (f.model) q = q.eq('model', f.model);
  if (f.yearMin !== undefined) q = q.gte('manufacture_year', f.yearMin);
  if (f.yearMax !== undefined) q = q.lte('manufacture_year', f.yearMax);
  if (f.mileageMax !== undefined) q = q.lte('mileage_km', f.mileageMax);
  if (f.priceMin !== undefined || f.priceMax !== undefined) {
    q = q.eq('price_on_request', false);
    if (f.priceMin !== undefined) q = q.gte('asking_price_eur', f.priceMin);
    if (f.priceMax !== undefined) q = q.lte('asking_price_eur', f.priceMax);
  }
  if (f.fuel) q = q.eq('fuel_type', f.fuel);
  if (f.transmission) q = q.eq('transmission', f.transmission);
  if (f.body) q = q.eq('body_type', f.body);
  if (f.damage) q = q.contains('damage_categories', [f.damage]);
  if (f.drivable !== undefined) q = q.eq('drivable', f.drivable);
  if (f.status) q = q.eq('status', f.status);
  return q;
}

function applySort(query: Query, sort: VehicleFilters['sort']): Query {
  const nullsLast = { nullsFirst: false } as const;
  switch (sort) {
    case 'year_desc':
      query = query.order('manufacture_year', { ascending: false, ...nullsLast });
      break;
    case 'year_asc':
      query = query.order('manufacture_year', { ascending: true, ...nullsLast });
      break;
    case 'mileage_asc':
      query = query.order('mileage_km', { ascending: true, ...nullsLast });
      break;
    case 'price_asc':
      query = query.order('asking_price_eur', { ascending: true, ...nullsLast });
      break;
    case 'price_desc':
      query = query.order('asking_price_eur', { ascending: false, ...nullsLast });
      break;
  }
  return query.order('published_at', { ascending: false }).order('id', { ascending: true });
}

function withEmbeddedFilters(query: Query, locale: Locale): Query {
  return query
    .in('vehicle_translations.locale', [...new Set([locale, DEFAULT_LOCALE])])
    .eq('vehicle_media.is_primary', true);
}

export const supabaseRepository: VehicleRepository = {
  async listVehicles(filters, locale) {
    const from = (filters.page - 1) * CATALOG_PAGE_SIZE;
    const query = withEmbeddedFilters(
      applySort(applyFilters(publicVehicles(SUMMARY_SELECT, { count: 'exact' }), filters), filters.sort),
      locale,
    ).range(from, from + CATALOG_PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error && error.code !== 'PGRST103') throw new Error(`listVehicles failed: ${error.message}`);

    let total = count ?? 0;
    if (error) {
      // Requested page is beyond the last page: return an empty page with the real total.
      const head = await applyFilters(publicVehicles('id', { count: 'exact' }), filters).limit(1);
      total = head.count ?? 0;
    }
    const rows = (data ?? []) as unknown as VehicleRowWithRelations[];
    return {
      items: rows.map((r) => mapVehicleSummary(r, locale)),
      total,
      page: filters.page,
      pageSize: CATALOG_PAGE_SIZE,
      pageCount: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)),
    };
  },

  async getVehicleBySlug(slug, locale) {
    const { data, error } = await publicVehicles(
      `${VEHICLE_COLUMNS},vehicle_translations(${TRANSLATION_COLUMNS}),vehicle_damages(${DAMAGE_COLUMNS}),vehicle_media(${MEDIA_COLUMNS})`,
    )
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(`getVehicleBySlug failed: ${error.message}`);
    return data ? mapVehicle(data as unknown as VehicleRowWithRelations, locale) : null;
  },

  async getSimilarVehicles(vehicle, locale, limit = 4) {
    const base = () =>
      withEmbeddedFilters(
        publicVehicles(SUMMARY_SELECT).in('status', ['available', 'pending']).neq('id', vehicle.id),
        locale,
      )
        .order('published_at', { ascending: false })
        .limit(limit);

    const results: VehicleRowWithRelations[] = [];
    const sameMake = await base().eq('make', vehicle.make);
    results.push(...((sameMake.data ?? []) as unknown as VehicleRowWithRelations[]));
    if (results.length < limit && vehicle.bodyType) {
      const sameBody = await base().eq('body_type', vehicle.bodyType);
      for (const row of (sameBody.data ?? []) as unknown as VehicleRowWithRelations[]) {
        if (!results.some((r) => r.id === row.id)) results.push(row);
      }
    }
    if (results.length < limit && vehicle.damageCategories.length) {
      const sameDamage = await base().overlaps('damage_categories', vehicle.damageCategories);
      for (const row of (sameDamage.data ?? []) as unknown as VehicleRowWithRelations[]) {
        if (!results.some((r) => r.id === row.id)) results.push(row);
      }
    }
    return results.slice(0, limit).map((r) => mapVehicleSummary(r, locale));
  },

  async getFilterOptions() {
    const { data, error } = await publicVehicles('make,model,manufacture_year').limit(5000);
    if (error) throw new Error(`getFilterOptions failed: ${error.message}`);
    const rows = (data ?? []) as unknown as Array<{ make: string; model: string; manufacture_year: number | null }>;
    const modelsByMake: Record<string, string[]> = {};
    for (const r of rows) {
      modelsByMake[r.make] = [...new Set([...(modelsByMake[r.make] ?? []), r.model])].sort();
    }
    const years = rows.map((r) => r.manufacture_year).filter((y): y is number => y !== null);
    return {
      makes: Object.keys(modelsByMake).sort((a, b) => a.localeCompare(b)),
      modelsByMake,
      yearMin: years.length ? Math.min(...years) : null,
      yearMax: years.length ? Math.max(...years) : null,
    };
  },

  async listPublishedSlugs() {
    const { data, error } = await publicVehicles('slug,updated_at').limit(50000);
    if (error) throw new Error(`listPublishedSlugs failed: ${error.message}`);
    return ((data ?? []) as unknown as Array<{ slug: string; updated_at: string }>).map((r) => ({
      slug: r.slug,
      updatedAt: r.updated_at,
    }));
  },
};
