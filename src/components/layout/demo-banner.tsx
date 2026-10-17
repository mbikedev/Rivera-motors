import { getTranslations } from 'next-intl/server';

export async function DemoBanner({ showDataSource }: { showDataSource: boolean }) {
  const t = await getTranslations('demo');
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950" role="note">
      <strong className="font-semibold">{t('banner')}</strong>
      {showDataSource ? <span className="block text-xs sm:ml-2 sm:inline">{t('dataSource')}</span> : null}
    </div>
  );
}
