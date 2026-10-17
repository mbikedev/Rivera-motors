import { Eye } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MediaManager } from '@/components/admin/media-manager';
import { VehicleForm } from '@/components/admin/vehicle-form';
import { Button } from '@/components/ui/button';
import { requireAdminPage } from '@/lib/admin/auth';
import { getAdminVehicleRow, rowMedia, rowToFormValues } from '@/lib/admin/queries';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata() {
  const t = await getTranslations('admin.form');
  return { title: t('editTitle') };
}

export default async function EditVehiclePage({ params, searchParams }: PageProps<'/admin/vehicles/[id]/edit'>) {
  const ctx = await requireAdminPage();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const row = await getAdminVehicleRow(ctx, id);
  if (!row) notFound();
  const { created } = await searchParams;
  const t = await getTranslations('admin');
  const title = row.vehicle_translations?.find((tr) => tr.locale === 'de')?.title ?? `${row.make} ${row.model}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{t('form.editTitle')}</p>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/vehicles/${id}/preview`}>
            <Eye aria-hidden /> {t('vehicles.preview')}
          </Link>
        </Button>
      </div>
      {created ? (
        <p role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          {t('form.saved')}
        </p>
      ) : null}
      <MediaManager vehicleId={id} media={rowMedia(row)} />
      <VehicleForm key={row.id} initialValues={rowToFormValues(row)} isNew={false} />
    </div>
  );
}
