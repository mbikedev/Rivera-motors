const TRANSLITERATIONS: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
  æ: 'ae',
  ø: 'o',
  œ: 'oe',
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[äöüßæøœ]/g, (c) => TRANSLITERATIONS[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

export function vehicleSlug(parts: Array<string | number | null | undefined>): string {
  return slugify(parts.filter((p) => p !== null && p !== undefined && String(p).trim() !== '').join(' '));
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
