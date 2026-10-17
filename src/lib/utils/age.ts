export interface VehicleAge {
  years: number;
  months: number;
}

/**
 * Age of a vehicle computed from its first registration date (not the model year),
 * relative to an explicit reference date. Returns null when the date is unknown or in the future.
 */
export function computeVehicleAge(firstRegistrationDate: string | null, referenceDate: Date): VehicleAge | null {
  if (!firstRegistrationDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(firstRegistrationDate);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const refY = referenceDate.getUTCFullYear();
  const refM = referenceDate.getUTCMonth() + 1;
  const refD = referenceDate.getUTCDate();

  let totalMonths = (refY - y) * 12 + (refM - m);
  if (refD < d) totalMonths -= 1;
  if (totalMonths < 0) return null;
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}
