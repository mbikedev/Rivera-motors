import { z } from 'zod';
import { BODY_TYPES, DAMAGE_CATEGORIES, FUEL_TYPES, PUBLIC_STATUSES, SORT_OPTIONS, TRANSMISSIONS } from './constants';
import type { VehicleFilters, VehicleRowWithRelations } from './types';

type RawParams = Record<string, string | string[] | undefined>;

const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const fieldSchemas = {
  q: z
    .string()
    .trim()
    .max(80)
    // Only keep characters that are safe inside PostgREST filter expressions.
    .transform((v) =>
      v
        .replace(/[^\p{L}\p{N}\s.\-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .pipe(z.string().min(1)),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  yearMin: int(1900, 2100),
  yearMax: int(1900, 2100),
  mileageMax: int(0, 2_000_000),
  priceMin: int(0, 10_000_000),
  priceMax: int(0, 10_000_000),
  fuel: z.enum(FUEL_TYPES),
  transmission: z.enum(TRANSMISSIONS),
  body: z.enum(BODY_TYPES),
  damage: z.enum(DAMAGE_CATEGORIES),
  drivable: z.enum(['yes', 'no']).transform((v) => v === 'yes'),
  status: z.enum(PUBLIC_STATUSES),
  sort: z.enum(SORT_OPTIONS),
  page: int(1, 10_000),
} as const;

export const FILTER_KEYS = Object.keys(fieldSchemas) as Array<keyof typeof fieldSchemas>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parses URL search params leniently: invalid values are ignored instead of failing the page. */
export function parseVehicleFilters(params: RawParams): VehicleFilters {
  const filters: VehicleFilters = { sort: 'newest', page: 1 };
  for (const key of FILTER_KEYS) {
    const raw = first(params[key]);
    if (raw === undefined || raw === '') continue;
    const result = fieldSchemas[key].safeParse(raw);
    if (result.success) {
      (filters as unknown as Record<string, unknown>)[key] = result.data;
    }
  }
  if (filters.yearMin && filters.yearMax && filters.yearMin > filters.yearMax) {
    [filters.yearMin, filters.yearMax] = [filters.yearMax, filters.yearMin];
  }
  if (filters.priceMin && filters.priceMax && filters.priceMin > filters.priceMax) {
    [filters.priceMin, filters.priceMax] = [filters.priceMax, filters.priceMin];
  }
  if (filters.model && !filters.make) delete filters.model;
  return filters;
}

/** Serialises filters back to a query string (defaults omitted) for shareable URLs. */
export function filtersToSearchParams(filters: Partial<VehicleFilters>): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value === undefined || value === null || value === '') continue;
    if (key === 'sort' && value === 'newest') continue;
    if (key === 'page' && value === 1) continue;
    if (key === 'drivable') {
      params.set(key, value ? 'yes' : 'no');
      continue;
    }
    params.set(key, String(value));
  }
  return params;
}

export function countActiveFilters(filters: VehicleFilters): number {
  return FILTER_KEYS.filter((k) => k !== 'sort' && k !== 'page' && filters[k] !== undefined).length;
}

// ---------------------------------------------------------------------------
// In-memory implementation (demo data source). Mirrors the Supabase query semantics.
// ---------------------------------------------------------------------------

function price(row: VehicleRowWithRelations): number | null {
  if (row.price_on_request || row.asking_price_eur === null) return null;
  const n = Number(row.asking_price_eur);
  return Number.isFinite(n) ? n : null;
}

export function matchesFilters(row: VehicleRowWithRelations, f: VehicleFilters): boolean {
  if (f.q) {
    const haystack = `${row.make} ${row.model} ${row.variant ?? ''}`.toLowerCase();
    if (
      !f.q
        .toLowerCase()
        .split(' ')
        .every((word) => haystack.includes(word))
    )
      return false;
  }
  if (f.make && row.make !== f.make) return false;
  if (f.model && row.model !== f.model) return false;
  if (f.yearMin !== undefined && (row.manufacture_year ?? -Infinity) < f.yearMin) return false;
  if (f.yearMax !== undefined && (row.manufacture_year ?? Infinity) > f.yearMax) return false;
  if (f.mileageMax !== undefined && (row.mileage_km ?? Infinity) > f.mileageMax) return false;
  if (f.priceMin !== undefined || f.priceMax !== undefined) {
    const p = price(row);
    if (p === null) return false;
    if (f.priceMin !== undefined && p < f.priceMin) return false;
    if (f.priceMax !== undefined && p > f.priceMax) return false;
  }
  if (f.fuel && row.fuel_type !== f.fuel) return false;
  if (f.transmission && row.transmission !== f.transmission) return false;
  if (f.body && row.body_type !== f.body) return false;
  if (f.damage) {
    const categories = row.damage_categories?.length
      ? row.damage_categories
      : (row.vehicle_damages ?? []).map((d) => d.category);
    if (!categories.includes(f.damage)) return false;
  }
  if (f.drivable !== undefined && row.drivable !== f.drivable) return false;
  if (f.status && row.status !== f.status) return false;
  return true;
}

function compareNullable(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1; // nulls last
  if (b === null) return -1;
  return (a - b) * direction;
}

export function compareRows(sort: VehicleFilters['sort']) {
  return (a: VehicleRowWithRelations, b: VehicleRowWithRelations): number => {
    let result = 0;
    switch (sort) {
      case 'year_desc':
        result = compareNullable(a.manufacture_year, b.manufacture_year, -1);
        break;
      case 'year_asc':
        result = compareNullable(a.manufacture_year, b.manufacture_year, 1);
        break;
      case 'mileage_asc':
        result = compareNullable(a.mileage_km, b.mileage_km, 1);
        break;
      case 'price_asc':
        result = compareNullable(price(a), price(b), 1);
        break;
      case 'price_desc':
        result = compareNullable(price(a), price(b), -1);
        break;
      default:
        result = 0;
    }
    if (result !== 0) return result;
    return (b.published_at ?? '').localeCompare(a.published_at ?? '') || a.id.localeCompare(b.id);
  };
}
