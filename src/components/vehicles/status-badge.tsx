import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { VehicleStatus } from '@/lib/data/constants';

const VARIANT: Record<VehicleStatus, 'success' | 'warning' | 'danger' | 'muted'> = {
  available: 'success',
  pending: 'warning',
  sold: 'danger',
  withdrawn: 'muted',
  draft: 'muted',
};

export function StatusBadge({ status, className }: { status: VehicleStatus; className?: string }) {
  const t = useTranslations('status');
  return (
    <Badge variant={VARIANT[status]} className={className}>
      {t(status)}
    </Badge>
  );
}
