import { PlusCircle } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/vehicles/status-badge';
import { requireAdminPage } from '@/lib/admin/auth';
import { getDashboardCounts, listAdminVehicles } from '@/lib/admin/queries';
import { VEHICLE_STATUSES } from '@/lib/data/constants';

export async function generateMetadata() {
  const t = await getTranslations('admin.dashboard');
  return { title: t('title') };
}

export default async function DashboardPage() {
  const ctx = await requireAdminPage();
  const t = await getTranslations('admin');
  const ts = await getTranslations('status');
  const format = await getFormatter();
  const [counts, recent] = await Promise.all([getDashboardCounts(ctx), listAdminVehicles(ctx, { limit: 6 })]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <Button asChild>
          <Link href="/admin/vehicles/new">
            <PlusCircle aria-hidden /> {t('vehicles.new')}
          </Link>
        </Button>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <li>
          <Card className="p-4">
            <p className="text-muted-foreground text-sm">{t('dashboard.total')}</p>
            <p className="text-3xl font-bold tabular-nums">{total}</p>
          </Card>
        </li>
        {VEHICLE_STATUSES.map((status) => (
          <li key={status}>
            <Link href={`/admin/vehicles?status=${status}`} className="hover:ring-ring block rounded-xl hover:ring-2">
              <Card className="p-4">
                <p className="text-muted-foreground text-sm">{ts(status)}</p>
                <p className="text-3xl font-bold tabular-nums">{counts[status]}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recent')}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('vehicles.empty')}</p>
          ) : (
            <ul className="divide-y">
              {recent.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <Link href={`/admin/vehicles/${v.id}/edit`} className="font-medium hover:underline">
                    {v.title ?? `${v.make} ${v.model}`}
                  </Link>
                  <span className="text-muted-foreground flex items-center gap-3 text-sm">
                    <StatusBadge status={v.status} />
                    {format.dateTime(new Date(v.updatedAt), { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
