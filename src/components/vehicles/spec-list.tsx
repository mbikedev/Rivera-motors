import type { ReactNode } from 'react';

export interface SpecItem {
  label: string;
  value: ReactNode | null;
  hint?: ReactNode;
}

/** Definition list of specifications. Unknown values are shown explicitly, never invented. */
export function SpecList({ items, notSpecified }: { items: SpecItem[]; notSpecified: string }) {
  return (
    <dl className="grid grid-cols-1 divide-y rounded-xl border sm:grid-cols-2 sm:divide-y-0">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`flex flex-col gap-0.5 px-4 py-3 sm:border-b ${i % 2 === 0 ? 'sm:border-r' : ''}`}
        >
          <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{item.label}</dt>
          <dd className={item.value === null || item.value === '' ? 'text-muted-foreground italic' : 'font-medium'}>
            {item.value === null || item.value === '' ? notSpecified : item.value}
            {item.hint ? (
              <span className="text-muted-foreground block text-xs font-normal not-italic">{item.hint}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
