'use client';

import { useTranslations } from 'next-intl';

/** Maps an action error code to a translated message. */
export function useAdminError() {
  const t = useTranslations('admin');
  return (code: string): string => {
    switch (code) {
      case 'unauthorized':
      case 'notFound':
      case 'generic':
        return t(`errors.${code}`);
      case 'deleteOnlyDrafts':
        return t('vehicles.deleteOnlyDrafts');
      case 'missingGerman':
        return t('status.missingGerman');
      case 'errorSlugTaken':
      case 'errorFields':
      case 'errorGeneric':
        return t(`form.${code}`);
      default:
        return t('errors.generic');
    }
  };
}
