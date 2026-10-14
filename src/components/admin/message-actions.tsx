'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteContactMessageAction, purgeContactMessagesAction } from '@/lib/admin/actions';
import { ConfirmButton } from './confirm-button';
import { useAdminError } from './use-admin-error';

export function DeleteMessageButton({ id }: { id: string }) {
  const t = useTranslations('admin.messages');
  const errorText = useAdminError();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <ConfirmButton
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={pending}
        message={t('confirmDelete')}
        confirmLabel={t('delete')}
        aria-label={t('delete')}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteContactMessageAction(id);
            if (result.ok) router.refresh();
            else setError(errorText(result.error));
          })
        }
      >
        <Trash2 aria-hidden />
      </ConfirmButton>
      {error ? (
        <span role="alert" className="text-destructive">
          {error}
        </span>
      ) : null}
    </>
  );
}

export function PurgeMessagesButton() {
  const t = useTranslations('admin.messages');
  const errorText = useAdminError();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmButton
        variant="outline"
        size="sm"
        disabled={pending}
        message={`${t('purge')}?`}
        confirmLabel={t('delete')}
        onConfirm={() =>
          startTransition(async () => {
            const result = await purgeContactMessagesAction();
            setNotice(result.ok ? t('purged', { count: result.data.count }) : errorText(result.error));
            router.refresh();
          })
        }
      >
        {t('purge')}
      </ConfirmButton>
      {notice ? (
        <p role="status" className="text-muted-foreground text-xs">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
