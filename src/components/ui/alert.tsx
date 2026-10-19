import { AlertTriangle, Info } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export function Alert({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: 'info' | 'warning';
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = variant === 'warning' ? AlertTriangle : Info;
  return (
    <div
      role="note"
      className={cn(
        'flex gap-3 rounded-lg border p-4 text-sm',
        variant === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-sky-200 bg-sky-50 text-sky-950',
        className,
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="break-words">{children}</div> : null}
      </div>
    </div>
  );
}
