import { getTranslations } from 'next-intl/server';
import type { OpeningHoursEntry } from '@/lib/data/types';

export async function OpeningHours({ hours }: { hours: OpeningHoursEntry[] }) {
  const t = await getTranslations('site');
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      {hours.map((entry) => (
        <div key={entry.day} className="contents">
          <dt className="text-muted-foreground">{t(`days.${entry.day}`)}</dt>
          <dd className="font-medium tabular-nums">
            {entry.open && entry.close ? `${entry.open} – ${entry.close}` : t('closed')}
          </dd>
        </div>
      ))}
    </dl>
  );
}
