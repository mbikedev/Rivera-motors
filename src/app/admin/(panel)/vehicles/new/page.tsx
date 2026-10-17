import { getTranslations } from 'next-intl/server';
import { VehicleForm } from '@/components/admin/vehicle-form';
import { requireAdminPage } from '@/lib/admin/auth';
import { emptyVehicleForm } from '@/lib/validation/vehicle';

export async function generateMetadata() {
  const t = await getTranslations('admin.form');
  return { title: t('createTitle') };
}

export default async function NewVehiclePage() {
  await requireAdminPage();
  const t = await getTranslations('admin.form');
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">{t('createTitle')}</h1>
      <p className="bg-card text-muted-foreground rounded-lg border p-4 text-sm">{t('saveFirst')}</p>
      <VehicleForm initialValues={emptyVehicleForm()} isNew />
    </div>
  );
}
