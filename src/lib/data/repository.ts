import 'server-only';
import type { Locale } from '@/i18n/locales';
import { isSupabaseConfigured } from '@/lib/env';
import { demoRepository } from './demo-repository';
import { supabaseRepository } from './supabase-repository';
import type { DataSource, FilterOptions, Vehicle, VehicleFilters, VehicleListResult, VehicleSummary } from './types';

export interface VehicleRepository {
  listVehicles(filters: VehicleFilters, locale: Locale): Promise<VehicleListResult>;
  getVehicleBySlug(slug: string, locale: Locale): Promise<Vehicle | null>;
  getSimilarVehicles(vehicle: Vehicle, locale: Locale, limit?: number): Promise<VehicleSummary[]>;
  getFilterOptions(): Promise<FilterOptions>;
  listPublishedSlugs(): Promise<Array<{ slug: string; updatedAt: string }>>;
}

/**
 * Supabase is the data source as soon as it is configured. Without configuration the site
 * runs on clearly labelled fictional demo data (local development, previews, CI).
 */
export const dataSource: DataSource = isSupabaseConfigured ? 'supabase' : 'demo';

if (!isSupabaseConfigured && process.env.REQUIRE_SUPABASE === 'true') {
  throw new Error('REQUIRE_SUPABASE=true but NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.');
}

export function getVehicleRepository(): VehicleRepository {
  return dataSource === 'supabase' ? supabaseRepository : demoRepository;
}
