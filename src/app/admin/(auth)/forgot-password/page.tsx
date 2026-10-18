import { getTranslations } from 'next-intl/server';
import { ForgotPasswordForm } from '@/components/admin/password-forms';

export default async function ForgotPasswordPage() {
  const t = await getTranslations('admin.forgot');
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('intro')}</p>
      </div>
      <ForgotPasswordForm />
    </>
  );
}
