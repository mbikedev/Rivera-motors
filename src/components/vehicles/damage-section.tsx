import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import type { Vehicle } from '@/lib/data/types';

const SEVERITY_VARIANT = { minor: 'warning', moderate: 'damage', severe: 'danger' } as const;

export async function DamageSection({ vehicle }: { vehicle: Vehicle }) {
  const t = await getTranslations();
  const { text } = vehicle;

  return (
    <section aria-labelledby="damages-title" className="space-y-5">
      <div>
        <h2 id="damages-title" className="text-xl font-bold">
          {t('detail.damagesTitle')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('detail.damagesIntro')}</p>
      </div>

      {text.damageSummary ? (
        <div className="border-accent bg-accent-soft rounded-xl border-l-4 p-4">
          <h3 className="text-sm font-semibold">{t('detail.damageSummary')}</h3>
          <p className="mt-1">{text.damageSummary}</p>
        </div>
      ) : null}

      {vehicle.damages.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {vehicle.damages.map((damage) => (
            <li key={damage.id} className="space-y-2 rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="damage">{t(`damageCategory.${damage.category}`)}</Badge>
                {damage.area ? <Badge variant="outline">{t(`damageArea.${damage.area}`)}</Badge> : null}
                {damage.severity ? (
                  <Badge variant={SEVERITY_VARIANT[damage.severity]}>
                    <span className="sr-only">{t('severity.label')}: </span>
                    {t(`severity.${damage.severity}`)}
                  </Badge>
                ) : null}
              </div>
              {damage.description ? (
                <p className="text-sm" lang={damage.isFallback ? 'de' : undefined}>
                  {damage.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{t('detail.noDamages')}</p>
      )}

      <dl className="space-y-4">
        {(
          [
            ['damageDetails', 'detail.damageDetails'],
            ['diagnosisNotes', 'detail.diagnosis'],
            ['repairNotes', 'detail.repairs'],
          ] as const
        ).map(([field, label]) =>
          text[field] ? (
            <div key={field}>
              <dt className="font-semibold">{t(label)}</dt>
              <dd
                className="text-muted-foreground mt-1 whitespace-pre-line"
                lang={vehicle.fallbackFields.includes(field) ? 'de' : undefined}
              >
                {text[field]}
              </dd>
            </div>
          ) : null,
        )}
      </dl>
    </section>
  );
}
