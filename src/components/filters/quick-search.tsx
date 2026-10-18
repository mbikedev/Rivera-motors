'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label, NativeSelect } from '@/components/ui/input';
import { DAMAGE_CATEGORIES } from '@/lib/data/constants';
import type { FilterOptions } from '@/lib/data/types';
import { formToQuery } from './filter-panel';

/** Home page quick search: make, model, year, max. price, damage type → catalogue with URL filters. */
export function QuickSearch({ action, options }: { action: string; options: FilterOptions }) {
  const t = useTranslations();
  const router = useRouter();
  const id = useId();
  const [make, setMake] = useState('');
  const models = make ? (options.modelsByMake[make] ?? []) : [];

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = formToQuery(event.currentTarget);
    router.push(query ? `${action}?${query}` : action);
  }

  return (
    <form
      action={action}
      method="get"
      onSubmit={onSubmit}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"
    >
      <div>
        <Label htmlFor={`${id}-make`}>{t('filters.make')}</Label>
        <NativeSelect
          id={`${id}-make`}
          name="make"
          value={make}
          onChange={(e) => setMake(e.currentTarget.value)}
          className="mt-1"
        >
          <option value="">{t('filters.anyMake')}</option>
          {options.makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <Label htmlFor={`${id}-model`}>{t('filters.model')}</Label>
        <NativeSelect id={`${id}-model`} name="model" disabled={!make} className="mt-1" key={make}>
          <option value="">{t('filters.anyModel')}</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <Label htmlFor={`${id}-year`}>{t('filters.yearMin')}</Label>
        <Input
          id={`${id}-year`}
          name="yearMin"
          type="number"
          inputMode="numeric"
          min={1900}
          max={2100}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`${id}-price`}>{t('filters.priceMax')}</Label>
        <Input
          id={`${id}-price`}
          name="priceMax"
          type="number"
          inputMode="numeric"
          min={0}
          step={500}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`${id}-damage`}>{t('filters.damage')}</Label>
        <NativeSelect id={`${id}-damage`} name="damage" className="mt-1">
          <option value="">{t('filters.any')}</option>
          {DAMAGE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`damageCategory.${c}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" variant="accent" className="w-full">
        <Search aria-hidden /> {t('filters.search')}
      </Button>
    </form>
  );
}
