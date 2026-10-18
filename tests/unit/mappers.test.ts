import { describe, expect, it } from 'vitest';
import { mapDamage, mapVehicle, resolveVehicleText } from '@/lib/data/mappers';
import type { VehicleRowWithRelations } from '@/lib/data/types';

const row = {
  id: 'a1',
  slug: 'demo',
  make: 'Renault',
  model: 'Clio',
  variant: null,
  status: 'available',
  price_on_request: true,
  asking_price_eur: null,
  vehicle_translations: [
    {
      locale: 'de',
      title: 'Renault Clio – Frontschaden',
      damage_summary: 'Frontschaden',
      damage_details: 'Details DE',
    },
    { locale: 'en', title: 'Renault Clio – front damage', damage_summary: '', damage_details: null },
  ],
  vehicle_damages: [],
  vehicle_media: [],
} as unknown as VehicleRowWithRelations;

describe('resolveVehicleText', () => {
  it('uses the requested language when available', () => {
    expect(resolveVehicleText(row, 'en').text.title).toBe('Renault Clio – front damage');
  });

  it('falls back to German per field and reports which fields fell back', () => {
    const { text, fallbackFields } = resolveVehicleText(row, 'en');
    expect(text.damageSummary).toBe('Frontschaden');
    expect(text.damageDetails).toBe('Details DE');
    expect(fallbackFields).toEqual(['damageSummary', 'damageDetails']);
  });

  it('falls back entirely when no translation exists, never inventing one', () => {
    const { text, fallbackFields } = resolveVehicleText(row, 'fr');
    expect(text.title).toBe('Renault Clio – Frontschaden');
    expect(fallbackFields).toContain('title');
    expect(text.repairNotes).toBeNull();
  });

  it('reports no fallback for German', () => {
    expect(resolveVehicleText(row, 'de').fallbackFields).toEqual([]);
  });
});

describe('mapDamage', () => {
  it('translates descriptions with German fallback and validates enums', () => {
    const damage = {
      category: 'engine',
      area: 'nowhere',
      severity: 'severe',
      description: 'Motor klopft',
      translations: { en: 'Engine knocks' },
    };
    expect(mapDamage(damage as never, 0, 'en')).toMatchObject({
      description: 'Engine knocks',
      isFallback: false,
      area: null,
    });
    expect(mapDamage(damage as never, 0, 'fr')).toMatchObject({ description: 'Motor klopft', isFallback: true });
  });
});

describe('mapVehicle', () => {
  it('does not expose a price when the price is on request', () => {
    const vehicle = mapVehicle(row, 'de');
    expect(vehicle.priceOnRequest).toBe(true);
    expect(vehicle.askingPriceEur).toBeNull();
  });
});
