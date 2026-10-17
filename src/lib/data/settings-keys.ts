export const SETTINGS_KEYS = ['company', 'contact', 'opening_hours', 'visit', 'home', 'features', 'legal'] as const;
export type SettingsKey = (typeof SETTINGS_KEYS)[number];
