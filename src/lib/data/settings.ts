import 'server-only';
import { cache } from 'react';
import { isSupabaseConfigured } from '@/lib/env';
import { getPublicSupabase } from '@/lib/supabase/public';
import { WEEKDAYS } from './constants';
import demoSettings from './demo/demo-settings.json';
import type { SiteSettings } from './types';

import type { SettingsKey } from './settings-keys';

type StoredSettings = Partial<Record<SettingsKey, unknown>>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function merge<T>(base: T, override: unknown): T {
  if (!isObject(base) || !isObject(override)) return (override ?? base) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    out[key] = isObject(value) && isObject(out[key]) ? merge(out[key], value) : value;
  }
  return out as T;
}

/** Converts stored rows (snake_case keys) into the settings object, on top of the fictional defaults. */
export function buildSiteSettings(stored: StoredSettings): SiteSettings {
  const defaults = demoSettings as unknown as Record<SettingsKey, unknown>;
  const pick = (key: SettingsKey) => merge(defaults[key], stored[key]);
  const hours = (
    Array.isArray(stored.opening_hours) ? stored.opening_hours : defaults.opening_hours
  ) as SiteSettings['openingHours'];
  return {
    company: pick('company') as SiteSettings['company'],
    contact: pick('contact') as SiteSettings['contact'],
    openingHours: WEEKDAYS.map((day) => hours.find((h) => h.day === day) ?? { day, open: null, close: null }),
    visit: pick('visit') as SiteSettings['visit'],
    home: pick('home') as SiteSettings['home'],
    features: pick('features') as SiteSettings['features'],
    legal: pick('legal') as SiteSettings['legal'],
  };
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (!isSupabaseConfigured) return buildSiteSettings({});
  const { data, error } = await getPublicSupabase().from('site_settings').select('key,value');
  if (error) {
    console.error('Failed to load site settings, using defaults', error.message);
    return buildSiteSettings({});
  }
  const stored: StoredSettings = {};
  for (const row of data ?? []) stored[row.key as SettingsKey] = row.value;
  return buildSiteSettings(stored);
});
