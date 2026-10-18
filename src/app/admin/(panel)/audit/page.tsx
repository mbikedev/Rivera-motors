import { getFormatter, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin/auth';
import { listAuditLogs } from '@/lib/admin/queries';

export async function generateMetadata() {
  const t = await getTranslations('admin.audit');
  return { title: t('title') };
}

const KNOWN_ACTIONS = [
  'vehicle_created',
  'vehicle_updated',
  'vehicle_published',
  'vehicle_unpublished',
  'vehicle_status_changed',
  'vehicle_deleted',
  'media_added',
  'media_deleted',
  'settings_updated',
  'contact_message_deleted',
] as const;
type KnownAction = (typeof KNOWN_ACTIONS)[number];

function summarize(details: Record<string, unknown>): string {
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ');
}

export default async function AuditPage() {
  const ctx = await requireAdminPage();
  const t = await getTranslations('admin.audit');
  const format = await getFormatter();
  const logs = await listAuditLogs(ctx);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('intro')}</p>
      </div>
      {logs.length === 0 ? (
        <p className="bg-card text-muted-foreground rounded-xl border p-6">{t('empty')}</p>
      ) : (
        <div className="bg-card overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  {t('when')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('who')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('action')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('details')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => {
                const key = log.action.replace('.', '_');
                const label = (KNOWN_ACTIONS as readonly string[]).includes(key)
                  ? t(`actions.${key as KnownAction}`)
                  : log.action;
                return (
                  <tr key={log.id}>
                    <td className="px-4 py-2 whitespace-nowrap tabular-nums">
                      {format.dateTime(new Date(log.createdAt), { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-2">{log.actor ?? t('system')}</td>
                    <td className="px-4 py-2">
                      {label}
                      {log.entityType === 'vehicle' && log.entityId && log.action !== 'vehicle.deleted' ? (
                        <>
                          {' '}
                          <Link href={`/admin/vehicles/${log.entityId}/edit`} className="text-xs underline">
                            ↗
                          </Link>
                        </>
                      ) : null}
                    </td>
                    <td className="text-muted-foreground max-w-md truncate px-4 py-2" title={summarize(log.details)}>
                      {summarize(log.details)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
