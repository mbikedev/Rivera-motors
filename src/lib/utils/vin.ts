/**
 * Masks a VIN for publication: keeps the manufacturer prefix (WMI + VDS, 11 chars)
 * and hides the serial number. "WVWZZZAUZHW123456" -> "WVWZZZAUZHW******".
 */
export function maskVin(vin: string, visible = 11): string {
  const clean = vin.replace(/\s+/g, '').toUpperCase();
  if (clean.length <= visible) return clean;
  return clean.slice(0, visible) + '*'.repeat(clean.length - visible);
}
