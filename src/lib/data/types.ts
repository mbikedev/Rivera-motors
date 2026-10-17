import type { Locale } from '@/i18n/locales';
import type {
  BodyType,
  DamageArea,
  DamageCategory,
  DamageSeverity,
  FuelType,
  PublicStatus,
  SortOption,
  Transmission,
  VehicleStatus,
  Weekday,
} from './constants';

// ---------------------------------------------------------------------------
// Database row shapes (snake_case, as returned by Supabase / stored in demo JSON)
// ---------------------------------------------------------------------------

export interface VehicleRow {
  id: string;
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  manufacture_year: number | null;
  first_registration_date: string | null;
  mileage_km: number | null;
  fuel_type: string | null;
  transmission: string | null;
  engine_cc: number | null;
  power_kw: number | null;
  body_type: string | null;
  doors: number | null;
  seats: number | null;
  color: string | null;
  euro_standard: string | null;
  co2_emissions_g_km: number | null;
  vin_public: string | null;
  origin_country: string | null;
  documents_available: string | null;
  service_history: string | null;
  technical_inspection: string | null;
  asking_price_eur: number | string | null;
  price_on_request: boolean;
  starts: boolean | null;
  drivable: boolean | null;
  missing_parts: string | null;
  damage_assessed_at: string | null;
  damage_categories?: string[] | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleTranslationRow {
  locale: string;
  title: string | null;
  damage_summary: string | null;
  damage_details: string | null;
  diagnosis_notes: string | null;
  repair_notes: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export interface VehicleDamageRow {
  id?: string;
  category: string;
  area: string | null;
  severity: string | null;
  description: string | null;
  translations: Record<string, string> | null;
  sort_order?: number;
}

export interface VehicleMediaRow {
  id?: string;
  storage_path: string;
  media_type: string;
  alt_text: string | null;
  caption: string | null;
  is_damage_view: boolean;
  is_primary: boolean;
  sort_order: number;
  width?: number | null;
  height?: number | null;
}

export interface VehicleRowWithRelations extends VehicleRow {
  vehicle_translations?: VehicleTranslationRow[] | null;
  vehicle_damages?: VehicleDamageRow[] | null;
  vehicle_media?: VehicleMediaRow[] | null;
}

// ---------------------------------------------------------------------------
// Domain model used by the UI
// ---------------------------------------------------------------------------

export interface VehicleText {
  title: string | null;
  damageSummary: string | null;
  damageDetails: string | null;
  diagnosisNotes: string | null;
  repairNotes: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export type VehicleTextField = keyof VehicleText;

export interface VehicleMedia {
  id: string;
  url: string;
  mediaType: 'image' | 'video';
  altText: string | null;
  caption: string | null;
  isDamageView: boolean;
  isPrimary: boolean;
  sortOrder: number;
  width: number | null;
  height: number | null;
}

export interface VehicleDamage {
  id: string;
  category: DamageCategory;
  area: DamageArea | null;
  severity: DamageSeverity | null;
  description: string | null;
  /** True when the description is shown in German because no translation exists. */
  isFallback: boolean;
}

export interface VehicleSummary {
  id: string;
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  title: string;
  manufactureYear: number | null;
  firstRegistrationDate: string | null;
  mileageKm: number | null;
  fuelType: FuelType | null;
  transmission: Transmission | null;
  bodyType: BodyType | null;
  powerKw: number | null;
  damageCategories: DamageCategory[];
  damageSummary: string | null;
  askingPriceEur: number | null;
  priceOnRequest: boolean;
  status: VehicleStatus;
  publishedAt: string | null;
  primaryMedia: VehicleMedia | null;
}

export interface Vehicle extends VehicleSummary {
  engineCc: number | null;
  doors: number | null;
  seats: number | null;
  color: string | null;
  euroStandard: string | null;
  co2EmissionsGKm: number | null;
  vinPublic: string | null;
  originCountry: string | null;
  documentsAvailable: string | null;
  serviceHistory: string | null;
  technicalInspection: string | null;
  starts: boolean | null;
  drivable: boolean | null;
  missingParts: string | null;
  damageAssessedAt: string | null;
  createdAt: string;
  updatedAt: string;
  text: VehicleText;
  /** Locale of the text that was requested. */
  locale: Locale;
  /** Text fields displayed in German because the requested translation is missing. */
  fallbackFields: VehicleTextField[];
  /** Locales for which a translation row exists. */
  availableLocales: Locale[];
  damages: VehicleDamage[];
  media: VehicleMedia[];
}

// ---------------------------------------------------------------------------
// Catalogue filters
// ---------------------------------------------------------------------------

export interface VehicleFilters {
  q?: string;
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  priceMin?: number;
  priceMax?: number;
  fuel?: FuelType;
  transmission?: Transmission;
  body?: BodyType;
  damage?: DamageCategory;
  drivable?: boolean;
  status?: PublicStatus;
  sort: SortOption;
  page: number;
}

export interface VehicleListResult {
  items: VehicleSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface FilterOptions {
  makes: string[];
  modelsByMake: Record<string, string[]>;
  yearMin: number | null;
  yearMax: number | null;
}

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

export type LocalizedText = Partial<Record<Locale, string>>;

export interface OpeningHoursEntry {
  day: Weekday;
  open: string | null;
  close: string | null;
}

export interface SiteSettings {
  company: { name: string; legalName: string; isDemo: boolean };
  contact: {
    phone: string;
    phoneDisplay: string;
    email: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
  };
  openingHours: OpeningHoursEntry[];
  visit: { appointmentRequired: boolean; notes: LocalizedText; parking: LocalizedText };
  home: { heroTitle: LocalizedText; heroSubtitle: LocalizedText };
  features: { contactForm: boolean };
  legal: {
    managingDirector: string;
    registerCourt: string;
    registerNumber: string;
    vatId: string;
    responsibleForContent: string;
  };
}

export type DataSource = 'supabase' | 'demo';
