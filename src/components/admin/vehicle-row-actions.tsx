'use client';

import { Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { duplicateVehicleAction, deleteVehicleAction } from '@/lib/admin/actions';
import type { VehicleStatus } from '@/lib/data/constants';
import { ConfirmButton } from './confirm-button';
import { useAdminError } from './use-admin-error';

export function VehicleRowActions({ id, status }: { id: string; slug: string; status: VehicleStatus }) {
  const t = useTranslations('admin.vehicles');
  const errorText = useAdminError();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-1" aria-busy={pending}>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/admin/vehicles/${id}/edit`}>
          <Pencil aria-hidden /> {t('edit')}
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/admin/vehicles/${id}/preview`}>
          <Eye aria-hidden /> {t('preview')}
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await duplicateVehicleAction(id);
            if (result.ok) router.push(`/admin/vehicles/${result.data.id}/edit`);
            else setMessage(errorText(result.error));
          })
        }
      >
        <Copy aria-hidden /> {t('duplicate')}
      </Button>
      {status === 'draft' ? (
        <ConfirmButton
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={pending}
          message={t('confirmDelete')}
          confirmLabel={t('delete')}
          onConfirm={() =>
            startTransition(async () => {
              const result = await deleteVehicleAction(id);
              if (result.ok) router.refresh();
              else setMessage(errorText(result.error));
            })
          }
        >
          <Trash2 aria-hidden /> {t('delete')}
        </ConfirmButton>
      ) : null}
      {message ? (
        <p role="alert" className="text-destructive w-full text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
