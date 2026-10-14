import { describe, expect, it } from 'vitest';
import { demoRepository } from '@/lib/data/demo-repository';

describe('demo data source', () => {
  it('lists only public vehicles (no drafts), newest first', async () => {
    const result = await demoRepository.listVehicles({ sort: 'newest', page: 1 }, 'de');
    expect(result.total).toBe(8);
    expect(result.items.map((v) => v.status)).not.toContain('draft');
    expect(result.items[0].slug).toBe('tesla-model-3-long-range-2021');
  });

  it('does not return drafts by slug', async () => {
    expect(await demoRepository.getVehicleBySlug('opel-corsa-f-entwurf', 'de')).toBeNull();
  });

  it('never exposes internal data such as the full VIN', async () => {
    const vehicle = await demoRepository.getVehicleBySlug('vw-golf-vii-1-4-tsi-highline-2017', 'en');
    expect(vehicle).not.toBeNull();
    const json = JSON.stringify(vehicle);
    expect(json).not.toMatch(/vin_private|internal_notes|WVWZZZAUZHW\d{6}/);
    expect(vehicle?.vinPublic).toBe('WVWZZZAUZHW******');
  });

  it('marks clearly fictional demo content', async () => {
    const vehicle = await demoRepository.getVehicleBySlug('renault-clio-v-tce-90-2020', 'fr');
    expect(vehicle?.fallbackFields.length).toBeGreaterThan(0);
  });
});
