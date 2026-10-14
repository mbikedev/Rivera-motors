'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label, NativeSelect } from '@/components/ui/input';
import {
  BODY_TYPES,
  DAMAGE_CATEGORIES,
  FUEL_TYPES,
  PUBLIC_STATUSES,
  SORT_OPTIONS,
  TRANSMISSIONS,
} from '@/lib/data/constants';
import type { FilterOptions, VehicleFilters } from '@/lib/data/types';
import { cn } from '@/lib/utils/cn';

/** Builds the query string from the form, dropping empty values and resetting the page. */
export function formToQuery(form: HTMLFormElement): string {
  const params = new URLSearchParams();
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value !== 'string' || value.trim() === '' || key === 'page') continue;
    if (key === 'sort' && value === 'newest') continue;
    params.set(key, value.trim());
  }
  return params.toString();
}

interface FilterPanelProps {
  action: string;
  filters: VehicleFilters;
  options: FilterOptions;
  activeCount: number;
}

export function FilterPanel({ action, filters, options, activeCount }: FilterPanelProps) {
  const t = useTranslations();
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [make, setMake] = useState(filters.make ?? '');
  const [pending, startTransition] = useTransition();
  const models = make ? (options.modelsByMake[make] ?? []) : [];
  const panelId = `${id}-panel`;

  function navigate(form: HTMLFormElement) {
    const query = formToQuery(form);
    startTransition(() => router.push(query ? `${action}?${query}` : action, { scroll: false }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(event.currentTarget);
    setOpen(false);
  }

  function autoSubmit(event: { currentTarget: HTMLSelectElement }) {
    const form = event.currentTarget.form;
    if (form) navigate(form);
  }

  const field = (name: string) => `${id}-${name}`;

  return (
    <form action={action} method="get" onSubmit={onSubmit} aria-busy={pending} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Label htmlFor={field('q')}>{t('filters.q')}</Label>
          <Input
            id={field('q')}
            name="q"
            type="search"
            defaultValue={filters.q ?? ''}
            placeholder={t('filters.qPlaceholder')}
            className="mt-1"
          />
        </div>
        <div className="w-full sm:w-56">
          <Label htmlFor={field('sort')}>{t('catalog.sortBy')}</Label>
          <NativeSelect
            id={field('sort')}
            name="sort"
            defaultValue={filters.sort}
            onChange={autoSubmit}
            className="mt-1"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`sort.${s}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          {t('filters.search')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full lg:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal aria-hidden />
          {open ? t('catalog.hideFilters') : t('catalog.showFilters')}
          {activeCount ? <span className="bg-accent rounded-full px-2 text-xs text-white">{activeCount}</span> : null}
        </Button>
      </div>

      <fieldset id={panelId} className={cn('rounded-xl border p-4', open ? 'block' : 'hidden lg:block')}>
        <legend className="px-1 text-sm font-semibold">{t('catalog.filters')}</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor={field('make')}>{t('filters.make')}</Label>
            <NativeSelect
              id={field('make')}
              name="make"
              value={make}
              onChange={(e) => {
                setMake(e.currentTarget.value);
                const form = e.currentTarget.form;
                if (form) {
                  const modelSelect = form.elements.namedItem('model') as HTMLSelectElement | null;
                  if (modelSelect) modelSelect.value = '';
                  navigate(form);
                }
              }}
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
            <Label htmlFor={field('model')}>{t('filters.model')}</Label>
            <NativeSelect
              id={field('model')}
              name="model"
              defaultValue={filters.model ?? ''}
              onChange={autoSubmit}
              disabled={!make}
              className="mt-1"
            >
              <option value="">{t('filters.anyModel')}</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor={field('damage')}>{t('filters.damage')}</Label>
            <NativeSelect
              id={field('damage')}
              name="damage"
              defaultValue={filters.damage ?? ''}
              onChange={autoSubmit}
              className="mt-1"
            >
              <option value="">{t('filters.any')}</option>
              {DAMAGE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`damageCategory.${c}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor={field('status')}>{t('filters.status')}</Label>
            <NativeSelect
              id={field('status')}
              name="status"
              defaultValue={filters.status ?? ''}
              onChange={autoSubmit}
              className="mt-1"
            >
              <option value="">{t('filters.any')}</option>
              {PUBLIC_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={field('yearMin')}>{t('filters.yearMin')}</Label>
              <Input
                id={field('yearMin')}
                name="yearMin"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                placeholder={options.yearMin ? String(options.yearMin) : undefined}
                defaultValue={filters.yearMin ?? ''}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={field('yearMax')}>{t('filters.yearMax')}</Label>
              <Input
                id={field('yearMax')}
                name="yearMax"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                placeholder={options.yearMax ? String(options.yearMax) : undefined}
                defaultValue={filters.yearMax ?? ''}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor={field('mileageMax')}>{t('filters.mileageMax')}</Label>
            <Input
              id={field('mileageMax')}
              name="mileageMax"
              type="number"
              inputMode="numeric"
              min={0}
              step={5000}
              defaultValue={filters.mileageMax ?? ''}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={field('priceMin')}>{t('filters.priceMin')}</Label>
              <Input
                id={field('priceMin')}
                name="priceMin"
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                defaultValue={filters.priceMin ?? ''}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={field('priceMax')}>{t('filters.priceMax')}</Label>
              <Input
                id={field('priceMax')}
                name="priceMax"
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                defaultValue={filters.priceMax ?? ''}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor={field('drivable')}>{t('filters.drivable')}</Label>
            <NativeSelect
              id={field('drivable')}
              name="drivable"
              defaultValue={filters.drivable === undefined ? '' : filters.drivable ? 'yes' : 'no'}
              onChange={autoSubmit}
              className="mt-1"
            >
              <option value="">{t('filters.any')}</option>
              <option value="yes">{t('filters.drivableYes')}</option>
              <option value="no">{t('filters.drivableNo')}</option>
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor={field('fuel')}>{t('filters.fuel')}</Label>
            <NativeSelect
              id={field('fuel')}
              name="fuel"
              defaultValue={filters.fuel ?? ''}
              onChange={autoSubmit}
              className="mt-1"
            >
              <option value="">{t('filters.any')}</option>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {t(`fuel.${f}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor={field('transmission')}>{t('filters.transmission')}</Label>
            <NativeSelect
              id={field('transmission')}
              name="transmission"
              defaultValue={filters.transmission ?? ''}
              onChange={autoSubmit}
              className="mt-1"
            >
              <option value="">{t('filters.any')}</option>
              {TRANSMISSIONS.map((v) => (
                <option key={v} value={v}>
                  {t(`transmission.${v}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor={field('body')}>{t('filters.body')}</Label>
            <NativeSelect
              id={field('body')}
              name="body"
              defaultValue={filters.body ?? ''}
              onChange={autoSubmit}
              className="mt-1"
            >
              <option value="">{t('filters.any')}</option>
              {BODY_TYPES.map((b) => (
                <option key={b} value={b}>
                  {t(`body.${b}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" variant="default">
            {t('catalog.apply')}
          </Button>
          {activeCount ? (
            <Button asChild variant="ghost">
              <a
                href={action}
                onClick={(e) => {
                  e.preventDefault();
                  setMake('');
                  e.currentTarget.closest('form')?.reset();
                  startTransition(() => router.push(action, { scroll: false }));
                }}
              >
                <X aria-hidden /> {t('catalog.reset')}
              </a>
            </Button>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
