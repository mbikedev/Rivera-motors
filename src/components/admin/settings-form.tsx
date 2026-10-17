'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError, Input, Label, Textarea } from '@/components/ui/input';
import { LOCALES } from '@/i18n/locales';
import { saveSettingsAction } from '@/lib/admin/actions';
import { WEEKDAYS } from '@/lib/data/constants';
import { cn } from '@/lib/utils/cn';
import { settingsSchema, type SettingsInput, type SettingsValues } from '@/lib/validation/settings';
import { useAdminError } from './use-admin-error';

type Path = FieldPath<SettingsInput>;

function getError(errors: unknown, path: string): string | undefined {
  let node: unknown = errors;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  const message = (node as { message?: unknown } | undefined)?.message;
  return typeof message === 'string' ? message : undefined;
}

export function SettingsForm({ initialValues }: { initialValues: SettingsInput }) {
  const t = useTranslations();
  const ts = useTranslations('admin.settings');
  const tf = useTranslations('admin.form');
  const errorText = useAdminError();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<SettingsInput, unknown, SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialValues,
  });
  const hours = useWatch({ control, name: 'opening_hours' });

  const errorFor = (path: string) => {
    const code = getError(errors, path);
    if (!code) return undefined;
    return code === 'required' ? tf('required') : tf('invalidNumber');
  };

  const text = (path: Path, label: string, opts: { type?: string; textarea?: boolean } = {}) => {
    const id = `s-${path.replace(/\./g, '-')}`;
    const error = errorFor(path);
    const common = {
      id,
      'aria-invalid': Boolean(error),
      'aria-describedby': error ? `${id}-error` : undefined,
      ...register(path),
    };
    return (
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {opts.textarea ? <Textarea rows={3} {...common} /> : <Input type={opts.type ?? 'text'} {...common} />}
        <FieldError id={`${id}-error`}>{error}</FieldError>
      </div>
    );
  };

  const checkbox = (path: Path, label: string) => (
    <label className="flex items-center gap-3 text-sm font-medium">
      <input type="checkbox" className="size-4 accent-[var(--primary)]" {...register(path)} />
      {label}
    </label>
  );

  const localized = (
    base: 'visit.notes' | 'visit.parking' | 'home.heroTitle' | 'home.heroSubtitle',
    label: string,
    textarea = false,
  ) => (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      <div className="grid gap-3 lg:grid-cols-3">
        {LOCALES.map((l) => (
          <div key={l}>{text(`${base}.${l}` as Path, t(`nav.languageNames.${l}`), { textarea })}</div>
        ))}
      </div>
    </fieldset>
  );

  function onSubmit() {
    setNotice(null);
    const input = getValues();
    startTransition(async () => {
      const result = await saveSettingsAction(input);
      if (!result.ok) {
        for (const [path, code] of Object.entries(result.fieldErrors ?? {})) setError(path as Path, { message: code });
        setNotice({ ok: false, text: errorText(result.error) });
        return;
      }
      reset(input);
      setNotice({ ok: true, text: ts('saved') });
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, () => setNotice({ ok: false, text: tf('errorFields') }))}
      noValidate
      className="space-y-6"
    >
      <Section title={ts('company')}>
        <div className="grid gap-4 sm:grid-cols-2">
          {text('company.name', ts('companyName'))}
          {text('company.legalName', ts('legalName'))}
        </div>
        <div className="mt-4">{checkbox('company.isDemo', ts('isDemo'))}</div>
      </Section>

      <Section title={ts('contact')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text('contact.phone', ts('phone'), { type: 'tel' })}
          {text('contact.phoneDisplay', ts('phoneDisplay'))}
          {text('contact.email', ts('email'), { type: 'email' })}
          {text('contact.street', ts('street'))}
          {text('contact.postalCode', ts('postalCode'))}
          {text('contact.city', ts('city'))}
          {text('contact.country', ts('country'))}
          {text('contact.latitude', ts('latitude'))}
          {text('contact.longitude', ts('longitude'))}
        </div>
      </Section>

      <Section title={ts('hours')}>
        <ul className="space-y-2">
          {WEEKDAYS.map((day, index) => {
            const closed = !hours?.[index]?.open && !hours?.[index]?.close;
            const openError = errorFor(`opening_hours.${index}.open`);
            const closeError = errorFor(`opening_hours.${index}.close`);
            return (
              <li
                key={day}
                className="grid grid-cols-[7rem_1fr] items-center gap-3 sm:grid-cols-[9rem_10rem_10rem_auto]"
              >
                <span className="text-sm font-medium">{t(`site.days.${day}`)}</span>
                <input type="hidden" {...register(`opening_hours.${index}.day`)} />
                <div className="col-start-2 flex gap-2 sm:contents">
                  <Input
                    type="time"
                    aria-label={`${t(`site.days.${day}`)} – ${ts('open')}`}
                    aria-invalid={Boolean(openError)}
                    className="h-10"
                    {...register(`opening_hours.${index}.open`)}
                  />
                  <Input
                    type="time"
                    aria-label={`${t(`site.days.${day}`)} – ${ts('close')}`}
                    aria-invalid={Boolean(closeError)}
                    className="h-10"
                    {...register(`opening_hours.${index}.close`)}
                  />
                </div>
                <label className={cn('col-start-2 flex items-center gap-2 text-sm sm:col-start-auto')}>
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={closed}
                    onChange={(e) => {
                      const isClosed = e.currentTarget.checked;
                      setValue(`opening_hours.${index}.open`, isClosed ? '' : '09:00', { shouldDirty: true });
                      setValue(`opening_hours.${index}.close`, isClosed ? '' : '17:00', { shouldDirty: true });
                    }}
                  />
                  {ts('closedDay')}
                </label>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={ts('visit')}>
        <div className="space-y-4">
          {checkbox('visit.appointmentRequired', ts('appointmentRequired'))}
          {localized('visit.notes', ts('visitNotes'), true)}
          {localized('visit.parking', ts('parking'), true)}
        </div>
      </Section>

      <Section title={ts('home')}>
        <div className="space-y-4">
          {localized('home.heroTitle', ts('heroTitle'))}
          {localized('home.heroSubtitle', ts('heroSubtitle'), true)}
        </div>
      </Section>

      <Section title={ts('features')}>{checkbox('features.contactForm', ts('contactForm'))}</Section>

      <Section title={ts('legal')}>
        <div className="grid gap-4 sm:grid-cols-2">
          {text('legal.managingDirector', ts('managingDirector'))}
          {text('legal.registerCourt', ts('registerCourt'))}
          {text('legal.registerNumber', ts('registerNumber'))}
          {text('legal.vatId', ts('vatId'))}
          {text('legal.responsibleForContent', ts('responsibleForContent'))}
        </div>
      </Section>

      <div className="bg-background/95 sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button type="submit" disabled={pending}>
          {pending ? tf('saving') : ts('save')}
        </Button>
        {notice ? (
          <p
            role={notice.ok ? 'status' : 'alert'}
            className={notice.ok ? 'text-sm text-green-700' : 'text-destructive text-sm'}
          >
            {notice.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
