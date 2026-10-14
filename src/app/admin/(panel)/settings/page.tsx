import { getTranslations } from 'next-intl/server';
import { SettingsForm } from '@/components/admin/settings-form';
import { LOCALES } from '@/i18n/locales';
import { requireAdminPage } from '@/lib/admin/auth';
import { buildSiteSettings } from '@/lib/data/settings';
import type { SettingsKey } from '@/lib/data/settings-keys';
import type { LocalizedText } from '@/lib/data/types';
import type { SettingsInput } from '@/lib/validation/settings';

export async function generateMetadata() {
  const t = await getTranslations('admin.settings');
  return { title: t('title') };
}

const fill = (text: LocalizedText) =>
  Object.fromEntries(LOCALES.map((l) => [l, text[l] ?? ''])) as Record<'de' | 'en' | 'fr', string>;

export default async function SettingsPage() {
  const { supabase } = await requireAdminPage();
  const t = await getTranslations('admin.settings');
  const { data, error } = await supabase.from('site_settings').select('key,value');
  if (error) throw new Error(error.message);
  const s = buildSiteSettings(Object.fromEntries((data ?? []).map((row) => [row.key as SettingsKey, row.value])));

  const initialValues: SettingsInput = {
    company: s.company,
    contact: {
      ...s.contact,
      latitude: s.contact.latitude === null ? '' : String(s.contact.latitude),
      longitude: s.contact.longitude === null ? '' : String(s.contact.longitude),
    },
    opening_hours: s.openingHours.map((h) => ({ day: h.day, open: h.open ?? '', close: h.close ?? '' })),
    visit: {
      appointmentRequired: s.visit.appointmentRequired,
      notes: fill(s.visit.notes),
      parking: fill(s.visit.parking),
    },
    home: { heroTitle: fill(s.home.heroTitle), heroSubtitle: fill(s.home.heroSubtitle) },
    features: s.features,
    legal: s.legal,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <SettingsForm initialValues={initialValues} />
    </div>
  );
}
