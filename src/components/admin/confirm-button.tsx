'use client';

import { AlertDialog } from 'radix-ui';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';

/** A button that asks for confirmation before running a destructive or important action. */
export function ConfirmButton({
  message,
  onConfirm,
  children,
  confirmLabel,
  destructive = true,
  ...buttonProps
}: Omit<ButtonProps, 'onClick'> & {
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  destructive?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('admin.common');
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button type="button" {...buttonProps}>
          {children}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <AlertDialog.Content className="bg-card fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-xl p-6 shadow-xl">
          <AlertDialog.Title className="text-base font-semibold">{message}</AlertDialog.Title>
          <AlertDialog.Description className="sr-only">{message}</AlertDialog.Description>
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="outline">{t('cancel')}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>
                {confirmLabel ?? t('confirm')}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
