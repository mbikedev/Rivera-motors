'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/vehicles/status-badge';
import { setVehicleStatusAction } from '@/lib/admin/actions';
import type { VehicleStatus } from '@/lib/data/constants';
import { ConfirmButton } from './confirm-button';
import { useAdminError } from './use-admin-error';

type Transition = {
  to: VehicleStatus;
  label: 'publish' | 'unpublish' | 'markPending' | 'markAvailable' | 'markSold' | 'markWithdrawn';
  confirm?: 'confirmSold' | 'confirmWithdrawn' | 'confirmUnpublish';
};

const TRANSITIONS: Record<VehicleStatus, Transition[]> = {
  draft: [{ to: 'available', label: 'publish' }],
  available: [
    { to: 'pending', label: 'markPending' },
    { to: 'sold', label: 'markSold', confirm: 'confirmSold' },
    { to: 'withdrawn', label: 'markWithdrawn', confirm: 'confirmWithdrawn' },
    { to: 'draft', label: 'unpublish', confirm: 'confirmUnpublish' },
  ],
  pending: [
    { to: 'available', label: 'markAvailable' },
    { to: 'sold', label: 'markSold', confirm: 'confirmSold' },
    { to: 'withdrawn', label: 'markWithdrawn', confirm: 'confirmWithdrawn' },
  ],
  sold: [
    { to: 'available', label: 'markAvailable' },
    { to: 'withdrawn', label: 'markWithdrawn', confirm: 'confirmWithdrawn' },
  ],
  withdrawn: [
    { to: 'available', label: 'publish' },
    { to: 'draft', label: 'unpublish', confirm: 'confirmUnpublish' },
  ],
};

/** Status changes are saved immediately (separately from the form) and logged in the audit trail. */
export function StatusPanel({
  vehicleId,
  status,
  onChanged,
}: {
  vehicleId: string;
  status: VehicleStatus;
  onChanged: (status: VehicleStatus) => void;
}) {
  const t = useTranslations('admin.status');
  const errorText = useAdminError();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  function change(to: VehicleStatus) {
    setNotice(null);
    startTransition(async () => {
      const result = await setVehicleStatusAction(vehicleId, to);
      if (!result.ok) {
        setNotice({ ok: false, text: errorText(result.error) });
        return;
      }
      onChanged(to);
      setNotice({ ok: true, text: t('changed') });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-center gap-2 text-sm">
          {t('current')}: <StatusBadge status={status} />
        </p>
        <div className="flex flex-wrap gap-2" aria-busy={pending}>
          {TRANSITIONS[status].map((tr) =>
            tr.confirm ? (
              <ConfirmButton
                key={tr.label + tr.to}
                variant="outline"
                size="sm"
                disabled={pending}
                message={t(tr.confirm)}
                confirmLabel={t(tr.label)}
                onConfirm={() => change(tr.to)}
              >
                {t(tr.label)}
              </ConfirmButton>
            ) : (
              <Button
                key={tr.label + tr.to}
                type="button"
                size="sm"
                variant={tr.label === 'publish' ? 'default' : 'outline'}
                disabled={pending}
                onClick={() => change(tr.to)}
              >
                {t(tr.label)}
              </Button>
            ),
          )}
        </div>
        {notice ? (
          <p
            role={notice.ok ? 'status' : 'alert'}
            className={notice.ok ? 'text-sm text-green-700' : 'text-destructive text-sm'}
          >
            {notice.text}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
