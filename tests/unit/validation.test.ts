import { describe, expect, it } from 'vitest';
import { contactSchema } from '@/lib/validation/contact';
import { emptyVehicleForm, toSavePayload, vehicleFormSchema } from '@/lib/validation/vehicle';

function validForm() {
  const form = emptyVehicleForm();
  form.slug = 'vw-golf-2017';
  form.make = 'Volkswagen';
  form.model = 'Golf';
  form.manufacture_year = '2017';
  form.mileage_km = '98000';
  form.translations.de.title = 'VW Golf – Frontschaden';
  form.translations.de.damage_summary = 'Frontschaden nach Auffahrunfall';
  return form;
}

describe('vehicleFormSchema', () => {
  it('accepts a minimal draft and converts empty strings to null', () => {
    const result = vehicleFormSchema.safeParse({ ...emptyVehicleForm(), slug: 'x', make: 'A', model: 'B' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mileage_km).toBeNull();
      expect(result.data.starts).toBeNull();
    }
  });

  it('requires German title and damage summary to publish', () => {
    const form = validForm();
    form.status = 'available';
    form.translations.de.damage_summary = '';
    const result = vehicleFormSchema.safeParse(form);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toContain('translations.de.damage_summary');
  });

  it('requires a price unless "price on request" is selected', () => {
    const form = { ...validForm(), price_on_request: false, asking_price_eur: '' };
    expect(vehicleFormSchema.safeParse(form).error?.issues[0].message).toBe('priceRequired');
    expect(vehicleFormSchema.safeParse({ ...form, asking_price_eur: '4990,50' }).data?.asking_price_eur).toBe(4990.5);
  });

  it('rejects invalid slugs', () => {
    expect(vehicleFormSchema.safeParse({ ...validForm(), slug: 'Not A Slug' }).success).toBe(false);
  });

  it('builds the save payload: only filled translations, internal data separated, no price when on request', () => {
    const form = validForm();
    form.translations.fr.title = 'VW Golf – dommage avant';
    form.asking_price_eur = '5000';
    form.vin_private = 'wvwzzzauzhw123456';
    form.damages = [
      {
        category: 'body',
        area: 'front',
        severity: 'moderate',
        description: 'Stoßfänger',
        description_en: 'Bumper',
        description_fr: '',
      },
    ];
    const payload = toSavePayload(vehicleFormSchema.parse(form));
    expect(Object.keys(payload.translations).sort()).toEqual(['de', 'fr']);
    expect(payload.vehicle.asking_price_eur).toBeNull();
    expect(payload.private.vin_private).toBe('WVWZZZAUZHW123456');
    expect(payload.vehicle).not.toHaveProperty('vin_private');
    expect(payload.damages[0].translations).toEqual({ en: 'Bumper' });
  });
});

describe('contactSchema', () => {
  const base = {
    name: 'Max Muster',
    message: 'Ich möchte das Fahrzeug besichtigen.',
    privacyConsent: true,
    website: '',
  };

  it('requires either an email or a phone number', () => {
    expect(contactSchema.safeParse(base).success).toBe(false);
    expect(contactSchema.safeParse({ ...base, phone: '+49 30 123' }).success).toBe(true);
    expect(contactSchema.safeParse({ ...base, email: 'max@example.org' }).success).toBe(true);
  });

  it('requires consent and rejects a filled honeypot', () => {
    expect(contactSchema.safeParse({ ...base, email: 'max@example.org', privacyConsent: false }).success).toBe(false);
    expect(contactSchema.safeParse({ ...base, email: 'max@example.org', website: 'spam' }).success).toBe(false);
  });
});
