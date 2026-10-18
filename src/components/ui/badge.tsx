import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      muted: 'bg-muted text-foreground',
      outline: 'border border-border text-foreground',
      damage: 'bg-accent-soft text-accent ring-1 ring-accent/30',
      success: 'bg-green-100 text-green-900',
      warning: 'bg-amber-100 text-amber-900',
      danger: 'bg-red-100 text-red-900',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
