export const VEHICLE_STATUSES = ['draft', 'available', 'pending', 'sold', 'withdrawn'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

/** Statuses visible to visitors (must match public.is_public_status in SQL). */
export const PUBLIC_STATUSES = ['available', 'pending', 'sold'] as const;
export type PublicStatus = (typeof PUBLIC_STATUSES)[number];

export function isPublicStatus(status: string): status is PublicStatus {
  return (PUBLIC_STATUSES as readonly string[]).includes(status);
}

export const DAMAGE_CATEGORIES = ['body', 'engine', 'gearbox', 'electrical', 'chassis', 'flood', 'other'] as const;
export type DamageCategory = (typeof DAMAGE_CATEGORIES)[number];

export const DAMAGE_AREAS = [
  'front',
  'rear',
  'left',
  'right',
  'front_left',
  'front_right',
  'rear_left',
  'rear_right',
  'hood',
  'roof',
  'bumper_front',
  'bumper_rear',
  'doors',
  'underbody',
  'interior',
  'engine_bay',
  'wheels',
  'windows',
  'trunk',
  'other',
] as const;
export type DamageArea = (typeof DAMAGE_AREAS)[number];

export const DAMAGE_SEVERITIES = ['minor', 'moderate', 'severe'] as const;
export type DamageSeverity = (typeof DAMAGE_SEVERITIES)[number];

export const FUEL_TYPES = [
  'petrol',
  'diesel',
  'hybrid',
  'plugin_hybrid',
  'electric',
  'lpg',
  'cng',
  'hydrogen',
  'other',
] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const TRANSMISSIONS = ['manual', 'automatic', 'semi_automatic'] as const;
export type Transmission = (typeof TRANSMISSIONS)[number];

export const BODY_TYPES = [
  'sedan',
  'hatchback',
  'estate',
  'suv',
  'coupe',
  'convertible',
  'van',
  'pickup',
  'minivan',
  'other',
] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const SORT_OPTIONS = ['newest', 'year_desc', 'year_asc', 'mileage_asc', 'price_asc', 'price_desc'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const CATALOG_PAGE_SIZE = 12;

export const MEDIA_BUCKET = 'vehicle-media';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
