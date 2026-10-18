import 'server-only';
import type { Locale } from '@/i18n/locales';
import { CATALOG_PAGE_SIZE, isPublicStatus } from './constants';
import demoData from './demo/demo-vehicles.json';
import { compareRows, matchesFilters } from './filters';
import { mapVehicle, mapVehicleSummary } from './mappers';
import type { VehicleRepository } from './repository';
import type { VehicleRowWithRelations } from './types';

type DemoVehicle = VehicleRowWithRelations & {
  translations: NonNullable<VehicleRowWithRelations['vehicle_translations']>;
  damages: NonNullable<VehicleRowWithRelations['vehicle_damages']>;
  media: NonNullable<VehicleRowWithRelations['vehicle_media']>;
};

/** Demo rows shaped like Supabase rows; drafts and withdrawn vehicles are excluded like RLS does. */
const rows: VehicleRowWithRelations[] = (demoData.vehicles as unknown as DemoVehicle[])
  .filter((v) => isPublicStatus(v.status) && v.published_at)
  .map(({ translations, damages, media, ...vehicle }) => {
    // Never carry internal data into the public model.
    const publicVehicle = { ...vehicle } as Record<string, unknown>;
    delete publicVehicle.private;
    return {
      ...(publicVehicle as unknown as VehicleRowWithRelations),
      damage_categories: [...new Set(damages.map((d) => d.category))].sort(),
      vehicle_translations: translations,
      vehicle_damages: damages,
      vehicle_media: media,
    };
  });

export const demoRepository: VehicleRepository = {
  async listVehicles(filters, locale: Locale) {
    const matching = rows.filter((r) => matchesFilters(r, filters)).sort(compareRows(filters.sort));
    const pageCount = Math.max(1, Math.ceil(matching.length / CATALOG_PAGE_SIZE));
    const page = Math.min(filters.page, pageCount);
    const start = (page - 1) * CATALOG_PAGE_SIZE;
    return {
      items: matching.slice(start, start + CATALOG_PAGE_SIZE).map((r) => mapVehicleSummary(r, locale)),
      total: matching.length,
      page,
      pageSize: CATALOG_PAGE_SIZE,
      pageCount,
    };
  },

  async getVehicleBySlug(slug, locale) {
    const row = rows.find((r) => r.slug === slug);
    return row ? mapVehicle(row, locale) : null;
  },

  async getSimilarVehicles(vehicle, locale, limit = 4) {
    const candidates = rows.filter((r) => r.id !== vehicle.id && r.status !== 'sold');
    const score = (r: VehicleRowWithRelations) =>
      (r.make === vehicle.make ? 3 : 0) +
      (r.body_type === vehicle.bodyType ? 2 : 0) +
      ((r.damage_categories ?? []).some((c) => vehicle.damageCategories.includes(c as never)) ? 1 : 0);
    return candidates
      .map((r) => ({ r, s: score(r) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s || compareRows('newest')(a.r, b.r))
      .slice(0, limit)
      .map(({ r }) => mapVehicleSummary(r, locale));
  },

  async getFilterOptions() {
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
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
  },
};
