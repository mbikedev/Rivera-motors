import type { Vehicle } from '@/lib/data/types';

const FUEL_SCHEMA: Record<string, string> = {
  petrol: 'Gasoline',
  diesel: 'Diesel',
  electric: 'Electricity',
  hybrid: 'Hybrid',
  plugin_hybrid: 'Plug-in hybrid',
  lpg: 'LPG',
  cng: 'CNG',
  hydrogen: 'Hydrogen',
};

/**
 * schema.org "Car" (a Vehicle and a Product) built only from known properties.
 * An Offer is included only when a price is published and the vehicle is available.
 */
export function buildVehicleJsonLd(vehicle: Vehicle, url: string, sellerName: string) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: vehicle.title,
    url,
    brand: { '@type': 'Brand', name: vehicle.make },
    model: vehicle.model,
    itemCondition: 'https://schema.org/DamagedCondition',
  };
  if (vehicle.text.damageSummary) data.description = vehicle.text.damageSummary;
  if (vehicle.variant) data.vehicleConfiguration = vehicle.variant;
  if (vehicle.manufactureYear) data.vehicleModelDate = String(vehicle.manufactureYear);
  if (vehicle.firstRegistrationDate) data.dateVehicleFirstRegistered = vehicle.firstRegistrationDate;
  if (vehicle.mileageKm !== null)
    data.mileageFromOdometer = { '@type': 'QuantitativeValue', value: vehicle.mileageKm, unitCode: 'KMT' };
  if (vehicle.fuelType && FUEL_SCHEMA[vehicle.fuelType]) data.fuelType = FUEL_SCHEMA[vehicle.fuelType];
  if (vehicle.transmission) data.vehicleTransmission = vehicle.transmission === 'manual' ? 'Manual' : 'Automatic';
  if (vehicle.color) data.color = vehicle.color;
  if (vehicle.doors) data.numberOfDoors = vehicle.doors;
  if (vehicle.seats) data.seatingCapacity = vehicle.seats;
  if (vehicle.vinPublic && !vehicle.vinPublic.includes('*')) data.vehicleIdentificationNumber = vehicle.vinPublic;
  if (vehicle.powerKw)
    data.vehicleEngine = {
      '@type': 'EngineSpecification',
      enginePower: { '@type': 'QuantitativeValue', value: vehicle.powerKw, unitCode: 'KWT' },
      ...(vehicle.engineCc
        ? { engineDisplacement: { '@type': 'QuantitativeValue', value: vehicle.engineCc, unitCode: 'CMQ' } }
        : {}),
    };
  const images = vehicle.media
    .filter((m) => m.mediaType === 'image')
    .map((m) => (m.url.startsWith('/') ? new URL(m.url, url).toString() : m.url));
  if (images.length) data.image = images;
  if (vehicle.askingPriceEur !== null && vehicle.status === 'available') {
    data.offers = {
      '@type': 'Offer',
      price: vehicle.askingPriceEur,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStoreOnly',
      itemCondition: 'https://schema.org/DamagedCondition',
      seller: { '@type': 'AutoDealer', name: sellerName },
    };
  }
  return data;
}

export function VehicleJsonLd({ vehicle, url, sellerName }: { vehicle: Vehicle; url: string; sellerName: string }) {
  const json = JSON.stringify(buildVehicleJsonLd(vehicle, url, sellerName)).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
