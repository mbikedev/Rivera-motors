import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/login-form';
import { Alert } from '@/components/ui/alert';
import { getAdminContext } from '@/lib/admin/auth';
import { isSupabaseConfigured } from '@/lib/env';

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  const t = await getTranslations('admin');
  if (await getAdminContext()) redirect('/admin');
  const { next } = await searchParams;
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">{t('login.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('login.intro')}</p>
      </div>
      {isSupabaseConfigured ? (
        <LoginForm next={typeof next === 'string' ? next : undefined} />
      ) : (
        <Alert variant="warning">{t('notConfigured')}</Alert>
      )}
    </>
  );
}
