import { describe, expect, it } from 'vitest';
import { countActiveFilters, filtersToSearchParams, matchesFilters, parseVehicleFilters } from '@/lib/data/filters';
import type { VehicleRowWithRelations } from '@/lib/data/types';

describe('parseVehicleFilters', () => {
  it('uses defaults for an empty query', () => {
    expect(parseVehicleFilters({})).toEqual({ sort: 'newest', page: 1 });
  });

  it('parses valid values and ignores invalid ones instead of failing', () => {
    const f = parseVehicleFilters({
      make: 'BMW',
      model: '320d',
      yearMin: '2015',
      mileageMax: 'abc',
      fuel: 'diesel',
      damage: 'not-a-category',
      drivable: 'no',
      status: 'draft',
      sort: 'price_asc',
      page: '2',
    });
    expect(f).toEqual({
      make: 'BMW',
      model: '320d',
      yearMin: 2015,
      fuel: 'diesel',
      drivable: false,
      sort: 'price_asc',
      page: 2,
    });
  });

  it('never accepts non-public statuses from the URL', () => {
    expect(parseVehicleFilters({ status: 'withdrawn' }).status).toBeUndefined();
    expect(parseVehicleFilters({ status: 'sold' }).status).toBe('sold');
  });

  it('swaps inverted ranges and drops a model without a make', () => {
    const f = parseVehicleFilters({
      yearMin: '2020',
      yearMax: '2010',
      priceMin: '9000',
      priceMax: '1000',
      model: 'Golf',
    });
    expect(f.yearMin).toBe(2010);
    expect(f.yearMax).toBe(2020);
    expect(f.priceMin).toBe(1000);
    expect(f.priceMax).toBe(9000);
    expect(f.model).toBeUndefined();
  });

  it('strips characters that could break the database filter expression', () => {
    expect(parseVehicleFilters({ q: 'golf),status.eq.draft' }).q).toBe('golf status.eq.draft');
    expect(parseVehicleFilters({ q: '%%%' }).q).toBeUndefined();
  });
});

describe('filtersToSearchParams', () => {
  it('round-trips and omits defaults so URLs stay shareable', () => {
    const query = 'make=VW&drivable=yes&sort=year_desc&page=3';
    const parsed = parseVehicleFilters(Object.fromEntries(new URLSearchParams(query)));
    expect(filtersToSearchParams(parsed).toString()).toBe('make=VW&drivable=yes&sort=year_desc&page=3');
    expect(filtersToSearchParams({ sort: 'newest', page: 1 }).toString()).toBe('');
  });

  it('counts active filters without sort and page', () => {
    expect(countActiveFilters(parseVehicleFilters({ make: 'VW', fuel: 'petrol', sort: 'price_asc', page: '2' }))).toBe(
      2,
    );
  });
});

describe('matchesFilters', () => {
  const row = {
    id: '1',
    make: 'Volkswagen',
    model: 'Golf',
    variant: '1.4 TSI',
    manufacture_year: 2017,
    mileage_km: 98000,
    price_on_request: false,
    asking_price_eur: 6900,
    fuel_type: 'petrol',
    transmission: 'manual',
    body_type: 'hatchback',
    drivable: true,
    status: 'available',
    damage_categories: ['body'],
  } as unknown as VehicleRowWithRelations;

  it('matches text search on make, model and variant', () => {
    expect(matchesFilters(row, { sort: 'newest', page: 1, q: 'golf tsi' })).toBe(true);
    expect(matchesFilters(row, { sort: 'newest', page: 1, q: 'passat' })).toBe(false);
  });

  it('applies ranges, damage and drivability', () => {
    const base = { sort: 'newest' as const, page: 1 };
    expect(matchesFilters(row, { ...base, priceMax: 7000, mileageMax: 100000, damage: 'body', drivable: true })).toBe(
      true,
    );
    expect(matchesFilters(row, { ...base, priceMax: 5000 })).toBe(false);
    expect(matchesFilters(row, { ...base, damage: 'engine' })).toBe(false);
  });

  it('excludes "price on request" vehicles from price filters', () => {
    const onRequest = { ...row, price_on_request: true } as VehicleRowWithRelations;
    expect(matchesFilters(onRequest, { sort: 'newest', page: 1, priceMin: 1 })).toBe(false);
  });
});
