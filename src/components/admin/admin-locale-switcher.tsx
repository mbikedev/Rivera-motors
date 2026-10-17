'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { NativeSelect } from '@/components/ui/input';
import { LOCALES } from '@/i18n/locales';
import { setAdminLocaleAction } from '@/lib/admin/actions';

export function AdminLocaleSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="text-muted-foreground block text-xs">
      {t('admin.language')}
      <NativeSelect
        className="mt-1 h-9"
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.currentTarget.value;
          startTransition(async () => {
            await setAdminLocaleAction(next);
            router.refresh();
          });
        }}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {t(`nav.languageNames.${l}`)}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
