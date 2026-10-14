'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { signInAction } from '@/lib/admin/actions';

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('admin.login');
  const [state, action, pending] = useActionState(signInAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ''} />
      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1"
        />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {t(state.error as 'invalid' | 'noAccess' | 'error')}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t('submitting') : t('submit')}
      </Button>
      <Link href="/admin/forgot-password" className="text-muted-foreground block text-center text-sm underline">
        {t('forgot')}
      </Link>
    </form>
  );
}
