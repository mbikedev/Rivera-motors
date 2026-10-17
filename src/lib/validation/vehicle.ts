import { z } from 'zod';
import { LOCALES, type Locale } from '@/i18n/locales';
import {
  BODY_TYPES,
  DAMAGE_AREAS,
  DAMAGE_CATEGORIES,
  DAMAGE_SEVERITIES,
  FUEL_TYPES,
  isPublicStatus,
  TRANSMISSIONS,
  VEHICLE_STATUSES,
} from '@/lib/data/constants';
import { SLUG_PATTERN } from '@/lib/utils/slug';

/*
 * Admin vehicle form. Field names match the database columns so the payload maps 1:1
 * to public.save_vehicle(). Error messages are translation keys under admin.form.* / admin.status.*.
 */

const blank = (v: unknown) => v === '' || v === undefined || v === null;

const text = (max: number) =>
  z.preprocess((v) => (blank(v) ? null : String(v).trim() || null), z.string().max(max).nullable());

const int = (min: number, max: number) =>
  z.preprocess(
    (v) => (blank(v) ? null : Number(v)),
    z.number('invalidNumber').int('invalidNumber').min(min, 'invalidNumber').max(max, 'invalidNumber').nullable(),
  );

const decimal = (min: number, max: number) =>
  z.preprocess(
    (v) => (blank(v) ? null : Number(String(v).replace(',', '.'))),
    z.number('invalidNumber').min(min, 'invalidNumber').max(max, 'invalidNumber').nullable(),
  );

const date = z.preprocess((v) => (blank(v) ? null : v), z.iso.date('invalidNumber').nullable());

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (blank(v) ? null : v), z.enum(values).nullable());

const triState = z.preprocess((v) => {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return null;
}, z.boolean().nullable());

const checkbox = z.preprocess((v) => v === true || v === 'true' || v === 'on', z.boolean());

export const translationSchema = z.object({
  title: text(160),
  damage_summary: text(2000),
  damage_details: text(10000),
  diagnosis_notes: text(5000),
  repair_notes: text(5000),
  seo_title: text(120),
  seo_description: text(320),
});

export const damageSchema = z.object({
  category: z.enum(DAMAGE_CATEGORIES, 'required'),
  area: optionalEnum(DAMAGE_AREAS),
  severity: optionalEnum(DAMAGE_SEVERITIES),
  description: text(2000),
  description_en: text(2000),
  description_fr: text(2000),
});

export const vehicleFormSchema = z
  .object({
    id: z.preprocess((v) => (blank(v) ? undefined : v), z.uuid().optional()),
    status: z.enum(VEHICLE_STATUSES),
    slug: z.string().trim().min(1, 'required').max(120).regex(SLUG_PATTERN, 'slugHint'),
    make: z.string().trim().min(1, 'required').max(60),
    model: z.string().trim().min(1, 'required').max(80),
    variant: text(120),
    manufacture_year: int(1900, 2100),
    first_registration_date: date,
    mileage_km: int(0, 3_000_000),
    fuel_type: optionalEnum(FUEL_TYPES),
    transmission: optionalEnum(TRANSMISSIONS),
    engine_cc: int(1, 20_000),
    power_kw: int(1, 2_000),
    body_type: optionalEnum(BODY_TYPES),
    doors: int(1, 9),
    seats: int(1, 60),
    color: text(60),
    euro_standard: text(20),
    co2_emissions_g_km: int(0, 1_000),
    vin_public: z.preprocess(
      (v) => (blank(v) ? null : String(v).trim().toUpperCase()),
      z
        .string()
        .max(17)
        .regex(/^[A-HJ-NPR-Z0-9*]+$/, 'invalidNumber')
        .nullable(),
    ),
    origin_country: text(60),
    documents_available: text(1000),
    service_history: text(2000),
    technical_inspection: text(200),
    asking_price_eur: decimal(0, 10_000_000),
    price_on_request: checkbox,
    starts: triState,
    drivable: triState,
    missing_parts: text(2000),
    damage_assessed_at: date,
    translations: z.object({ de: translationSchema, en: translationSchema, fr: translationSchema }),
    damages: z.array(damageSchema).max(50),
    vin_private: z.preprocess((v) => (blank(v) ? null : String(v).trim().toUpperCase()), z.string().max(17).nullable()),
    internal_notes: text(5000),
  })
  .superRefine((v, ctx) => {
    if (!v.price_on_request && v.asking_price_eur === null) {
      ctx.addIssue({ code: 'custom', path: ['asking_price_eur'], message: 'priceRequired' });
    }
    if (isPublicStatus(v.status)) {
      if (!v.translations.de.title) {
        ctx.addIssue({ code: 'custom', path: ['translations', 'de', 'title'], message: 'missingGerman' });
      }
      if (!v.translations.de.damage_summary) {
        ctx.addIssue({ code: 'custom', path: ['translations', 'de', 'damage_summary'], message: 'missingGerman' });
      }
    }
  });

export type VehicleFormInput = z.input<typeof vehicleFormSchema>;
export type VehicleFormValues = z.output<typeof vehicleFormSchema>;
export type TranslationValues = z.output<typeof translationSchema>;

const VEHICLE_COLUMNS = [
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
  'missing_parts',
  'damage_assessed_at',
] as const;

function hasContent(t: TranslationValues): boolean {
  return Object.values(t).some((value) => value !== null && value !== '');
}

/** Builds the JSON payload for public.save_vehicle(). */
export function toSavePayload(values: VehicleFormValues) {
  const vehicle = Object.fromEntries(VEHICLE_COLUMNS.map((c) => [c, values[c]]));
  if (values.price_on_request) vehicle.asking_price_eur = null;

  const translations: Partial<Record<Locale, TranslationValues>> = { de: values.translations.de };
  for (const locale of LOCALES) {
    if (locale !== 'de' && hasContent(values.translations[locale])) translations[locale] = values.translations[locale];
  }

  return {
    id: values.id ?? null,
    status: values.status,
    vehicle,
    translations,
    damages: values.damages.map((d) => ({
      category: d.category,
      area: d.area,
      severity: d.severity,
      description: d.description,
      translations: Object.fromEntries(
        (
          [
            ['en', d.description_en],
            ['fr', d.description_fr],
          ] as const
        ).filter(([, value]) => value),
      ),
    })),
    private: { vin_private: values.vin_private, internal_notes: values.internal_notes },
  };
}

const emptyTranslation = (): Record<keyof TranslationValues, string> => ({
  title: '',
  damage_summary: '',
  damage_details: '',
  diagnosis_notes: '',
  repair_notes: '',
  seo_title: '',
  seo_description: '',
});

export function emptyVehicleForm(): VehicleFormInput {
  return {
    status: 'draft',
    slug: '',
    make: '',
    model: '',
    variant: '',
    manufacture_year: '',
    first_registration_date: '',
    mileage_km: '',
    fuel_type: '',
    transmission: '',
    engine_cc: '',
    power_kw: '',
    body_type: '',
    doors: '',
    seats: '',
    color: '',
    euro_standard: '',
    co2_emissions_g_km: '',
    vin_public: '',
    origin_country: '',
    documents_available: '',
    service_history: '',
    technical_inspection: '',
    asking_price_eur: '',
    price_on_request: true,
    starts: '',
    drivable: '',
    missing_parts: '',
    damage_assessed_at: '',
    translations: { de: emptyTranslation(), en: emptyTranslation(), fr: emptyTranslation() },
    damages: [],
    vin_private: '',
    internal_notes: '',
  };
}
