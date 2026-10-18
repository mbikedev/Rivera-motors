import { ImageOff, PlusCircle } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { VehicleRowActions } from '@/components/admin/vehicle-row-actions';
import { Button } from '@/components/ui/button';
import { Input, NativeSelect } from '@/components/ui/input';
import { StatusBadge } from '@/components/vehicles/status-badge';
import { requireAdminPage } from '@/lib/admin/auth';
import { listAdminVehicles } from '@/lib/admin/queries';
import { VEHICLE_STATUSES, type VehicleStatus } from '@/lib/data/constants';

export async function generateMetadata() {
  const t = await getTranslations('admin.vehicles');
  return { title: t('title') };
}

export default async function AdminVehiclesPage({ searchParams }: PageProps<'/admin/vehicles'>) {
  const ctx = await requireAdminPage();
  const t = await getTranslations('admin');
  const ts = await getTranslations('status');
  const format = await getFormatter();
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.slice(0, 100) : '';
  const status = (VEHICLE_STATUSES as readonly string[]).includes(String(params.status))
    ? (params.status as VehicleStatus)
    : undefined;
  const vehicles = await listAdminVehicles(ctx, { q, status });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('vehicles.title')}</h1>
        <Button asChild>
          <Link href="/admin/vehicles/new">
            <PlusCircle aria-hidden /> {t('vehicles.new')}
          </Link>
        </Button>
      </div>

      <form method="get" className="flex flex-wrap gap-2" role="search">
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t('vehicles.search')}
          aria-label={t('vehicles.search')}
          className="min-w-56 flex-1"
        />
        <NativeSelect name="status" defaultValue={status ?? ''} aria-label={t('status.current')} className="w-48">
          <option value="">{t('vehicles.allStatuses')}</option>
          {VEHICLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ts(s)}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          {t('vehicles.filter')}
        </Button>
      </form>

      {vehicles.length === 0 ? (
        <p className="bg-card text-muted-foreground rounded-xl border p-6">{t('vehicles.empty')}</p>
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {vehicles.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-4 p-3 sm:flex-nowrap">
              <Link href={`/admin/vehicles/${v.id}/edit`} className="shrink-0" tabIndex={-1} aria-hidden>
                {v.thumbnail && v.thumbnail.mediaType === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail, any origin
                  <img src={v.thumbnail.url} alt="" className="h-16 w-24 rounded-md object-cover" loading="lazy" />
                ) : (
                  <span className="bg-muted flex h-16 w-24 items-center justify-center rounded-md">
                    <ImageOff className="text-muted-foreground size-5" />
                  </span>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/vehicles/${v.id}/edit`} className="font-semibold hover:underline">
                  {v.title ?? `${v.make} ${v.model}`}
                </Link>
                <p className="text-muted-foreground truncate text-sm">
                  {[v.make, v.model, v.variant].filter(Boolean).join(' ')} · /{v.slug} · {t('vehicles.photos')}:{' '}
                  {v.mediaCount}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t('vehicles.updated')}:{' '}
                  {format.dateTime(new Date(v.updatedAt), { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <StatusBadge status={v.status} />
              <VehicleRowActions id={v.id} slug={v.slug} status={v.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
