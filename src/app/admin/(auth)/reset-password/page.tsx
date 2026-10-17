import { getTranslations } from 'next-intl/server';
import { ResetPasswordForm } from '@/components/admin/password-forms';

export default async function ResetPasswordPage() {
  const t = await getTranslations('admin.reset');
  return (
    <>
      <h1 className="text-xl font-bold">{t('title')}</h1>
      <ResetPasswordForm />
    </>
  );
}
