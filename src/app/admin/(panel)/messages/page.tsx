import { getFormatter, getTranslations } from 'next-intl/server';
import { DeleteMessageButton, PurgeMessagesButton } from '@/components/admin/message-actions';
import { requireAdminPage } from '@/lib/admin/auth';
import { listContactMessages } from '@/lib/admin/queries';

export async function generateMetadata() {
  const t = await getTranslations('admin.messages');
  return { title: t('title') };
}

export default async function MessagesPage() {
  const ctx = await requireAdminPage();
  const t = await getTranslations('admin.messages');
  const format = await getFormatter();
  const messages = await listContactMessages(ctx);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('intro')}</p>
        </div>
        <PurgeMessagesButton />
      </div>
      {messages.length === 0 ? (
        <p className="bg-card text-muted-foreground rounded-xl border p-6">{t('empty')}</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id as string} className="bg-card space-y-2 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-sm">
                  <p className="font-semibold">{m.name as string}</p>
                  <p className="text-muted-foreground">
                    {[m.email, m.phone].filter(Boolean).map((v, i) => (
                      <span key={i}>
                        {i ? ' · ' : ''}
                        {String(v).includes('@') ? (
                          <a href={`mailto:${v}`} className="underline">
                            {String(v)}
                          </a>
                        ) : (
                          <a href={`tel:${String(v).replace(/[^+\d]/g, '')}`} className="underline">
                            {String(v)}
                          </a>
                        )}
                      </span>
                    ))}
                  </p>
                </div>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span>
                    {t('received')}:{' '}
                    {format.dateTime(new Date(m.created_at as string), { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
                    {String(m.locale ?? '').toUpperCase()}
                  </span>
                  <DeleteMessageButton id={m.id as string} />
                </div>
              </div>
              {m.vehicle_slug ? (
                <p className="text-sm">
                  {t('vehicle')}: <span className="font-mono">{m.vehicle_slug as string}</span>
                </p>
              ) : null}
              <p className="text-sm whitespace-pre-line">{m.message as string}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
