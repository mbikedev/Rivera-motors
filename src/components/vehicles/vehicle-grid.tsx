import type { VehicleSummary } from '@/lib/data/types';
import { VehicleCard } from './vehicle-card';

export function VehicleGrid({ vehicles, priorityCount = 0 }: { vehicles: VehicleSummary[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {vehicles.map((vehicle, index) => (
        <li key={vehicle.id}>
          <VehicleCard vehicle={vehicle} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
