'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { requestPasswordResetAction, updatePasswordAction } from '@/lib/admin/actions';

export function ForgotPasswordForm() {
  const t = useTranslations('admin.forgot');
  const [state, action, pending] = useActionState(requestPasswordResetAction, {});
  return state.sent ? (
    <div className="space-y-4">
      <p role="status">{t('sent')}</p>
      <Link href="/admin/login" className="text-sm underline">
        {t('backToLogin')}
      </Link>
    </div>
  ) : (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required className="mt-1" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {t('submit')}
      </Button>
      <Link href="/admin/login" className="text-muted-foreground block text-center text-sm underline">
        {t('backToLogin')}
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations('admin.reset');
  const router = useRouter();
  const [state, action, pending] = useActionState(updatePasswordAction, {});
  useEffect(() => {
    if (state.done) {
      const timer = setTimeout(() => router.push('/admin'), 1500);
      return () => clearTimeout(timer);
    }
  }, [state.done, router]);

  if (state.done) return <p role="status">{t('done')}</p>;
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="mt-1"
        />
        <p className="text-muted-foreground mt-1 text-xs">{t('tooShort')}</p>
      </div>
      <div>
        <Label htmlFor="confirm">{t('confirm')}</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="mt-1"
        />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {t(state.error as 'mismatch' | 'tooShort' | 'invalidLink')}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {t('submit')}
      </Button>
    </form>
  );
}
