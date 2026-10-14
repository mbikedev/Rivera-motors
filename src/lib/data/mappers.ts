import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locales';
import { env } from '@/lib/env';
import { toNumberOrNull } from '@/lib/utils/format';
import {
  BODY_TYPES,
  DAMAGE_AREAS,
  DAMAGE_CATEGORIES,
  DAMAGE_SEVERITIES,
  FUEL_TYPES,
  MEDIA_BUCKET,
  TRANSMISSIONS,
  VEHICLE_STATUSES,
  type DamageCategory,
} from './constants';
import type {
  Vehicle,
  VehicleDamage,
  VehicleDamageRow,
  VehicleMedia,
  VehicleMediaRow,
  VehicleRowWithRelations,
  VehicleSummary,
  VehicleText,
  VehicleTextField,
  VehicleTranslationRow,
} from './types';

function oneOf<T extends readonly string[]>(values: T, value: string | null | undefined): T[number] | null {
  return value && (values as readonly string[]).includes(value) ? (value as T[number]) : null;
}

function nonEmpty(value: string | null | undefined): string | null {
  return value && value.trim() !== '' ? value : null;
}

/** Public URL of a stored media file. Demo assets use site-relative paths. */
export function mediaUrl(storagePath: string): string {
  if (storagePath.startsWith('/') || /^https?:\/\//.test(storagePath)) return storagePath;
  return `${env.supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${storagePath
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

export function mapMedia(row: VehicleMediaRow, index: number): VehicleMedia {
  return {
    id: row.id ?? `${row.storage_path}#${index}`,
    url: mediaUrl(row.storage_path),
    mediaType: row.media_type === 'video' ? 'video' : 'image',
    altText: nonEmpty(row.alt_text),
    caption: nonEmpty(row.caption),
    isDamageView: Boolean(row.is_damage_view),
    isPrimary: Boolean(row.is_primary),
    sortOrder: row.sort_order ?? index,
    width: row.width ?? null,
    height: row.height ?? null,
  };
}

export function sortMedia(rows: VehicleMediaRow[] | null | undefined): VehicleMedia[] {
  return (rows ?? [])
    .map(mapMedia)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
}

const TEXT_COLUMNS: Array<[VehicleTextField, keyof VehicleTranslationRow]> = [
  ['title', 'title'],
  ['damageSummary', 'damage_summary'],
  ['damageDetails', 'damage_details'],
  ['diagnosisNotes', 'diagnosis_notes'],
  ['repairNotes', 'repair_notes'],
  ['seoTitle', 'seo_title'],
  ['seoDescription', 'seo_description'],
];

/** Fields whose German fallback is pointed out to the visitor. */
const VISIBLE_TEXT_FIELDS: VehicleTextField[] = [
  'title',
  'damageSummary',
  'damageDetails',
  'diagnosisNotes',
  'repairNotes',
];

/**
 * Picks each text field in the requested locale, falling back to German (never inventing a translation).
 */
export function resolveVehicleText(
  row: VehicleRowWithRelations,
  locale: Locale,
): { text: VehicleText; fallbackFields: VehicleTextField[] } {
  const translations = row.vehicle_translations ?? [];
  const requested = translations.find((t) => t.locale === locale);
  const germanRow = translations.find((t) => t.locale === DEFAULT_LOCALE);
  // The vehicle row mirrors the German master copy; use it if the translation row is missing.
  const german: Partial<VehicleTranslationRow> = germanRow ?? {
    damage_summary: (row as { damage_summary?: string | null }).damage_summary ?? null,
    damage_details: (row as { damage_details?: string | null }).damage_details ?? null,
    diagnosis_notes: (row as { diagnosis_notes?: string | null }).diagnosis_notes ?? null,
    repair_notes: (row as { repair_notes?: string | null }).repair_notes ?? null,
  };

  const text = {} as VehicleText;
  const fallbackFields: VehicleTextField[] = [];
  for (const [field, column] of TEXT_COLUMNS) {
    const own = nonEmpty(requested?.[column] as string | null | undefined);
    if (own) {
      text[field] = own;
      continue;
    }
    const fallback = locale === DEFAULT_LOCALE ? null : nonEmpty(german[column] as string | null | undefined);
    text[field] = locale === DEFAULT_LOCALE ? nonEmpty(german[column] as string | null | undefined) : fallback;
    if (fallback && VISIBLE_TEXT_FIELDS.includes(field)) fallbackFields.push(field);
  }
  return { text, fallbackFields };
}

export function defaultTitle(row: Pick<VehicleRowWithRelations, 'make' | 'model' | 'variant'>): string {
  return [row.make, row.model, row.variant].filter(Boolean).join(' ');
}

export function mapDamage(row: VehicleDamageRow, index: number, locale: Locale): VehicleDamage {
  const translated = locale === DEFAULT_LOCALE ? null : nonEmpty(row.translations?.[locale]);
  const german = nonEmpty(row.description);
  return {
    id: row.id ?? `damage-${index}`,
    category: oneOf(DAMAGE_CATEGORIES, row.category) ?? 'other',
    area: oneOf(DAMAGE_AREAS, row.area),
    severity: oneOf(DAMAGE_SEVERITIES, row.severity),
    description: translated ?? german,
    isFallback: locale !== DEFAULT_LOCALE && !translated && Boolean(german),
  };
}

function damageCategories(row: VehicleRowWithRelations): DamageCategory[] {
  const source = row.damage_categories?.length
    ? row.damage_categories
    : (row.vehicle_damages ?? []).map((d) => d.category);
  return [...new Set(source)]
    .map((c) => oneOf(DAMAGE_CATEGORIES, c))
    .filter((c): c is DamageCategory => c !== null)
    .sort();
}

export function mapVehicleSummary(row: VehicleRowWithRelations, locale: Locale): VehicleSummary {
  const { text } = resolveVehicleText(row, locale);
  const media = sortMedia(row.vehicle_media);
  return {
    id: row.id,
    slug: row.slug,
    make: row.make,
    model: row.model,
    variant: nonEmpty(row.variant),
    title: text.title ?? defaultTitle(row),
    manufactureYear: row.manufacture_year,
    firstRegistrationDate: row.first_registration_date,
    mileageKm: row.mileage_km,
    fuelType: oneOf(FUEL_TYPES, row.fuel_type),
    transmission: oneOf(TRANSMISSIONS, row.transmission),
    bodyType: oneOf(BODY_TYPES, row.body_type),
    powerKw: row.power_kw,
    damageCategories: damageCategories(row),
    damageSummary: text.damageSummary,
    askingPriceEur: row.price_on_request ? null : toNumberOrNull(row.asking_price_eur),
    priceOnRequest: row.price_on_request || toNumberOrNull(row.asking_price_eur) === null,
    status: oneOf(VEHICLE_STATUSES, row.status) ?? 'draft',
    publishedAt: row.published_at,
    primaryMedia: media.find((m) => m.mediaType === 'image') ?? null,
  };
}

export function mapVehicle(row: VehicleRowWithRelations, locale: Locale): Vehicle {
  const summary = mapVehicleSummary(row, locale);
  const { text, fallbackFields } = resolveVehicleText(row, locale);
  const damages = [...(row.vehicle_damages ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((d, i) => mapDamage(d, i, locale));
  return {
    ...summary,
    engineCc: row.engine_cc,
    doors: row.doors,
    seats: row.seats,
    color: nonEmpty(row.color),
    euroStandard: nonEmpty(row.euro_standard),
    co2EmissionsGKm: row.co2_emissions_g_km,
    vinPublic: nonEmpty(row.vin_public),
    originCountry: nonEmpty(row.origin_country),
    documentsAvailable: nonEmpty(row.documents_available),
    serviceHistory: nonEmpty(row.service_history),
    technicalInspection: nonEmpty(row.technical_inspection),
    starts: row.starts,
    drivable: row.drivable,
    missingParts: nonEmpty(row.missing_parts),
    damageAssessedAt: row.damage_assessed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    text,
    locale,
    fallbackFields: [
      ...fallbackFields,
      ...(damages.some((d) => d.isFallback) ? (['damageDetails'] as const) : []),
    ].filter((f, i, all) => all.indexOf(f) === i),
    availableLocales: (row.vehicle_translations ?? []).map((t) => t.locale).filter(isLocale),
    damages,
    media: sortMedia(row.vehicle_media),
  };
}
