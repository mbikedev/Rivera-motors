'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('catalog');
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center" role="alert">
      <h1 className="text-2xl font-bold">{t('errorTitle')}</h1>
      <p className="text-muted-foreground">{t('errorText')}</p>
      <Button onClick={reset}>{t('retry')}</Button>
    </div>
  );
}
