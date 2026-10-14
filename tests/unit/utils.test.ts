import { describe, expect, it } from 'vitest';
import { computeVehicleAge } from '@/lib/utils/age';
import { formatPrice, kwToHp, telHref } from '@/lib/utils/format';
import { SLUG_PATTERN, slugify, vehicleSlug } from '@/lib/utils/slug';
import { maskVin } from '@/lib/utils/vin';

describe('computeVehicleAge', () => {
  const ref = new Date('2026-10-14T12:00:00Z');

  it('counts from the first registration date, not the model year', () => {
    expect(computeVehicleAge('2017-03-15', ref)).toEqual({ years: 9, months: 6 });
  });

  it('does not count a month that has not been completed yet', () => {
    expect(computeVehicleAge('2020-10-20', ref)).toEqual({ years: 5, months: 11 });
    expect(computeVehicleAge('2020-10-14', ref)).toEqual({ years: 6, months: 0 });
  });

  it('returns null for unknown, invalid or future dates', () => {
    expect(computeVehicleAge(null, ref)).toBeNull();
    expect(computeVehicleAge('not-a-date', ref)).toBeNull();
    expect(computeVehicleAge('2027-01-01', ref)).toBeNull();
  });
});

describe('maskVin', () => {
  it('keeps the manufacturer part and hides the serial number', () => {
    expect(maskVin('WVWZZZAUZHW123456')).toBe('WVWZZZAUZHW******');
  });
  it('normalises spaces and case', () => {
    expect(maskVin(' wvwzzz auzhw123456 ')).toBe('WVWZZZAUZHW******');
  });
});

describe('slugify', () => {
  it('produces URL-safe slugs with German transliteration', () => {
    expect(slugify('Mercedes-Benz C 220 d Kühlerschaden')).toBe('mercedes-benz-c-220-d-kuehlerschaden');
    expect(slugify('Škoda Octavia Combi 2.0 TDI')).toBe('skoda-octavia-combi-2-0-tdi');
    expect(slugify('  --Größe!!  ')).toBe('groesse');
  });
  it('builds vehicle slugs that match the database pattern', () => {
    const slug = vehicleSlug(['Renault', 'Clio V', 'TCe 90', 2020, null]);
    expect(slug).toBe('renault-clio-v-tce-90-2020');
    expect(SLUG_PATTERN.test(slug)).toBe(true);
  });
});

describe('format helpers', () => {
  it('converts kW to hp', () => {
    expect(kwToHp(110)).toBe(150);
  });
  it('formats prices per locale', () => {
    expect(formatPrice(12500, 'de').replace(/\s/g, ' ')).toBe('12.500 €');
    expect(formatPrice(12500, 'en')).toBe('€12,500');
  });
  it('builds tel: links', () => {
    expect(telHref('+49 (0) 30 123-45')).toMatch(/^tel:\+?[0-9]+$/);
  });
});
