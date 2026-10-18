'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Plus, Trash2, Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { useFieldArray, useForm, useWatch, type FieldPath, type UseFormRegisterReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError, Input, Label, NativeSelect, Textarea } from '@/components/ui/input';
import { LOCALES, type Locale } from '@/i18n/locales';
import { saveVehicleAction } from '@/lib/admin/actions';
import {
  BODY_TYPES,
  DAMAGE_AREAS,
  DAMAGE_CATEGORIES,
  DAMAGE_SEVERITIES,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_STATUSES,
  type VehicleStatus,
} from '@/lib/data/constants';
import { cn } from '@/lib/utils/cn';
import { vehicleSlug } from '@/lib/utils/slug';
import { maskVin } from '@/lib/utils/vin';
import { vehicleFormSchema, type VehicleFormInput, type VehicleFormValues } from '@/lib/validation/vehicle';
import { StatusPanel } from './status-panel';
import { useAdminError } from './use-admin-error';

type Path = FieldPath<VehicleFormInput>;

const TRANSLATION_FIELDS = [
  { name: 'title', rows: 0 },
  { name: 'damage_summary', rows: 3 },
  { name: 'damage_details', rows: 6 },
  { name: 'diagnosis_notes', rows: 3 },
  { name: 'repair_notes', rows: 3 },
  { name: 'seo_title', rows: 0 },
  { name: 'seo_description', rows: 2 },
] as const;

const TRANSLATION_LABELS = {
  title: 'title',
  damage_summary: 'damageSummary',
  damage_details: 'damageDetails',
  diagnosis_notes: 'diagnosisNotes',
  repair_notes: 'repairNotes',
  seo_title: 'seoTitle',
  seo_description: 'seoDescription',
} as const;

const FIELD_MESSAGES = ['required', 'invalidNumber', 'slugHint', 'priceRequired', 'errorSlugTaken'] as const;

/** Reads a nested error message from RHF's error tree using a dotted path. */
function getError(errors: unknown, path: string): string | undefined {
  let node: unknown = errors;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  const message = (node as { message?: unknown } | undefined)?.message;
  return typeof message === 'string' ? message : undefined;
}

export function VehicleForm({ initialValues, isNew }: { initialValues: VehicleFormInput; isNew: boolean }) {
  const t = useTranslations();
  const tf = useTranslations('admin.form');
  const errorText = useAdminError();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tab, setTab] = useState<Locale>('de');
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const form = useForm<VehicleFormInput, unknown, VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
  } = form;
  const damages = useFieldArray({ control, name: 'damages' });
  const priceOnRequest = useWatch({ control, name: 'price_on_request' });
  const status = useWatch({ control, name: 'status' }) as VehicleStatus;

  const message = (path: string) => {
    const code = getError(errors, path);
    if (!code) return undefined;
    if (code === 'missingGerman') return t('admin.status.missingGerman');
    if ((FIELD_MESSAGES as readonly string[]).includes(code)) return tf(code as (typeof FIELD_MESSAGES)[number]);
    return tf('invalidNumber');
  };

  /** Registers a field and wires aria attributes for accessible error messages. */
  const field = (path: Path, extra?: Parameters<typeof register>[1]) => {
    const id = `f-${path.replace(/\./g, '-')}`;
    const error = message(path);
    return {
      id,
      error,
      props: {
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? `${id}-error` : undefined,
        ...register(path, extra),
      } as UseFormRegisterReturn & { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string },
    };
  };

  function suggestSlug() {
    const { make, model, variant, manufacture_year } = getValues();
    const slug = vehicleSlug([make, model, variant as string, manufacture_year as string]);
    if (slug) setValue('slug', slug, { shouldDirty: true, shouldValidate: true });
  }

  function onInvalid() {
    setNotice({ type: 'error', text: tf('errorFields') });
    if (errors.translations) {
      const firstLocale = LOCALES.find((l) => errors.translations?.[l]);
      if (firstLocale) setTab(firstLocale);
    }
  }

  function onSubmit() {
    setNotice(null);
    const input = getValues();
    startTransition(async () => {
      const result = await saveVehicleAction(input);
      if (!result.ok) {
        for (const [path, code] of Object.entries(result.fieldErrors ?? {})) {
          setError(path as Path, { type: 'server', message: code });
        }
        setNotice({ type: 'error', text: errorText(result.error) });
        return;
      }
      if (isNew) {
        router.push(`/admin/vehicles/${result.data.id}/edit?created=1`);
        return;
      }
      reset(input);
      setNotice({ type: 'success', text: tf('saved') });
      router.refresh();
    });
  }

  const vehicleId = initialValues.id as string | undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6">
      {!isNew && vehicleId ? (
        <StatusPanel
          vehicleId={vehicleId}
          status={status}
          onChanged={(next) => setValue('status', next, { shouldDirty: false })}
        />
      ) : null}

      <Section title={tf('basics')}>
        <Grid>
          <TextField
            label={t('vehicle.make')}
            required
            {...field('make', { onBlur: () => !slugTouched && suggestSlug() })}
          />
          <TextField
            label={t('vehicle.model')}
            required
            {...field('model', { onBlur: () => !slugTouched && suggestSlug() })}
          />
          <TextField label={t('vehicle.variant')} {...field('variant')} />
          <TextField
            label={t('vehicle.manufactureYear')}
            type="number"
            inputMode="numeric"
            {...field('manufacture_year')}
          />
          <TextField label={t('vehicle.firstRegistration')} type="date" {...field('first_registration_date')} />
          <TextField label={tf('mileage')} type="number" inputMode="numeric" {...field('mileage_km')} />
        </Grid>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <TextField
            label={tf('slug')}
            hint={tf('slugHint')}
            required
            {...field('slug', { onChange: () => setSlugTouched(true) })}
          />
          <Button type="button" variant="outline" onClick={suggestSlug}>
            <Wand2 aria-hidden /> {tf('generateSlug')}
          </Button>
        </div>
        {isNew ? (
          <div className="mt-4 max-w-xs">
            <SelectField label={tf('statusOnSave')} {...field('status')}>
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </SelectField>
          </div>
        ) : null}
      </Section>

      <Section title={tf('technical')}>
        <Grid>
          <SelectField label={t('vehicle.fuel')} {...field('fuel_type')}>
            <option value="">{tf('select')}</option>
            {FUEL_TYPES.map((v) => (
              <option key={v} value={v}>
                {t(`fuel.${v}`)}
              </option>
            ))}
          </SelectField>
          <SelectField label={t('vehicle.transmission')} {...field('transmission')}>
            <option value="">{tf('select')}</option>
            {TRANSMISSIONS.map((v) => (
              <option key={v} value={v}>
                {t(`transmission.${v}`)}
              </option>
            ))}
          </SelectField>
          <SelectField label={t('vehicle.body')} {...field('body_type')}>
            <option value="">{tf('select')}</option>
            {BODY_TYPES.map((v) => (
              <option key={v} value={v}>
                {t(`body.${v}`)}
              </option>
            ))}
          </SelectField>
          <TextField label={tf('kw')} type="number" inputMode="numeric" {...field('power_kw')} />
          <TextField label={tf('engineCc')} type="number" inputMode="numeric" {...field('engine_cc')} />
          <TextField label={t('vehicle.doors')} type="number" inputMode="numeric" {...field('doors')} />
          <TextField label={t('vehicle.seats')} type="number" inputMode="numeric" {...field('seats')} />
          <TextField label={t('vehicle.color')} {...field('color')} />
          <TextField label={t('vehicle.euroStandard')} {...field('euro_standard')} />
          <TextField label={tf('co2')} type="number" inputMode="numeric" {...field('co2_emissions_g_km')} />
        </Grid>
      </Section>

      <Section title={tf('registration')}>
        <Grid>
          <TextField label={t('vehicle.originCountry')} {...field('origin_country')} />
          <TextField label={t('vehicle.technicalInspection')} {...field('technical_inspection')} />
        </Grid>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TextAreaField label={t('vehicle.documents')} rows={3} {...field('documents_available')} />
          <TextAreaField label={t('vehicle.serviceHistory')} rows={3} {...field('service_history')} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <TextField label={tf('vinPublic')} hint={tf('vinPublicHint')} maxLength={17} {...field('vin_public')} />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const vin = getValues('vin_private');
              if (vin) setValue('vin_public', maskVin(String(vin)), { shouldDirty: true, shouldValidate: true });
            }}
          >
            {tf('maskVin')}
          </Button>
        </div>
      </Section>

      <Section title={tf('priceStatus')}>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" {...register('price_on_request')} />
          {tf('priceOnRequest')}
        </label>
        {!priceOnRequest ? (
          <div className="mt-4 max-w-xs">
            <TextField
              label={tf('askingPrice')}
              type="number"
              inputMode="decimal"
              step="50"
              min="0"
              {...field('asking_price_eur')}
            />
          </div>
        ) : null}
      </Section>

      <Section title={tf('condition')}>
        <Grid>
          <SelectField label={t('vehicle.starts')} {...field('starts')}>
            <option value="">{tf('triUnknown')}</option>
            <option value="true">{t('common.yes')}</option>
            <option value="false">{t('common.no')}</option>
          </SelectField>
          <SelectField label={t('vehicle.drivable')} {...field('drivable')}>
            <option value="">{tf('triUnknown')}</option>
            <option value="true">{t('common.yes')}</option>
            <option value="false">{t('common.no')}</option>
          </SelectField>
          <TextField label={tf('damageAssessedAt')} type="date" {...field('damage_assessed_at')} />
        </Grid>
        <div className="mt-4">
          <TextAreaField label={tf('missingParts')} rows={2} {...field('missing_parts')} />
        </div>
      </Section>

      <Section title={tf('damages')}>
        {damages.fields.length === 0 ? <p className="text-muted-foreground text-sm">{tf('noDamages')}</p> : null}
        <ol className="space-y-4">
          {damages.fields.map((item, index) => (
            <li key={item.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">#{index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => damages.remove(index)}
                >
                  <Trash2 aria-hidden /> {tf('removeDamage')}
                </Button>
              </div>
              <Grid>
                <SelectField label={tf('damageCategory')} required {...field(`damages.${index}.category`)}>
                  <option value="">{tf('select')}</option>
                  {DAMAGE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`damageCategory.${c}`)}
                    </option>
                  ))}
                </SelectField>
                <SelectField label={tf('damageArea')} {...field(`damages.${index}.area`)}>
                  <option value="">{tf('none')}</option>
                  {DAMAGE_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {t(`damageArea.${a}`)}
                    </option>
                  ))}
                </SelectField>
                <SelectField label={tf('damageSeverity')} {...field(`damages.${index}.severity`)}>
                  <option value="">{tf('none')}</option>
                  {DAMAGE_SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {t(`severity.${s}`)}
                    </option>
                  ))}
                </SelectField>
              </Grid>
              <TextAreaField label={tf('damageDescription')} rows={2} {...field(`damages.${index}.description`)} />
              <div className="grid gap-3 lg:grid-cols-2">
                <TextAreaField
                  label={tf('damageDescriptionEn')}
                  rows={2}
                  {...field(`damages.${index}.description_en`)}
                />
                <TextAreaField
                  label={tf('damageDescriptionFr')}
                  rows={2}
                  {...field(`damages.${index}.description_fr`)}
                />
              </div>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() =>
            damages.append({
              category: '' as never,
              area: '',
              severity: '',
              description: '',
              description_en: '',
              description_fr: '',
            })
          }
        >
          <Plus aria-hidden /> {tf('addDamage')}
        </Button>
      </Section>

      <Section title={tf('texts')}>
        <div role="tablist" aria-label={tf('texts')} className="mb-4 flex gap-1 border-b">
          {LOCALES.map((locale) => {
            const hasError = Boolean(errors.translations?.[locale]);
            return (
              <button
                key={locale}
                type="button"
                role="tab"
                id={`tab-${locale}`}
                aria-selected={tab === locale}
                aria-controls={`panel-${locale}`}
                onClick={() => setTab(locale)}
                className={cn(
                  '-mb-px border-b-2 px-4 py-2 text-sm font-medium',
                  tab === locale ? 'border-primary text-foreground' : 'text-muted-foreground border-transparent',
                  hasError && 'text-destructive',
                )}
              >
                {t(`nav.languageNames.${locale}`)}
                {locale === 'de' ? ' *' : ''}
              </button>
            );
          })}
        </div>
        {LOCALES.map((locale) => (
          <div
            key={locale}
            role="tabpanel"
            id={`panel-${locale}`}
            aria-labelledby={`tab-${locale}`}
            hidden={tab !== locale}
            className="space-y-4"
          >
            <p className="text-muted-foreground text-sm">
              {locale === 'de' ? tf('requiredForPublish') : tf('optionalTranslation')}
            </p>
            {TRANSLATION_FIELDS.map(({ name, rows }) => {
              const label = tf(TRANSLATION_LABELS[name]);
              const f = field(`translations.${locale}.${name}`);
              const required = locale === 'de' && (name === 'title' || name === 'damage_summary');
              return rows ? (
                <TextAreaField key={name} label={label} rows={rows} required={required} {...f} />
              ) : (
                <TextField key={name} label={label} required={required} {...f} />
              );
            })}
          </div>
        ))}
      </Section>

      <Section title={tf('private')} className="border-amber-300 bg-amber-50/40">
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField label={tf('vinPrivate')} maxLength={17} autoComplete="off" {...field('vin_private')} />
          <TextAreaField label={tf('internalNotes')} rows={3} {...field('internal_notes')} />
        </div>
      </Section>

      <div className="bg-background/95 sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button type="submit" disabled={pending}>
          {pending ? tf('saving') : tf('save')}
        </Button>
        {isDirty && !pending ? <span className="text-muted-foreground text-sm">{tf('unsaved')}</span> : null}
        {notice ? (
          <p
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={cn(
              'flex items-center gap-2 text-sm',
              notice.type === 'error' ? 'text-destructive' : 'text-green-700',
            )}
          >
            {notice.type === 'success' ? <CheckCircle2 className="size-4" aria-hidden /> : null}
            {notice.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  props: UseFormRegisterReturn & { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string };
}

function FieldShell({
  id,
  label,
  error,
  hint,
  required,
  children,
}: Omit<FieldProps, 'props'> & { children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

function TextField({ props, ...rest }: FieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'>) {
  const { id, label, error, hint, required, ...inputProps } = rest as FieldProps &
    React.InputHTMLAttributes<HTMLInputElement>;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <Input {...inputProps} {...props} />
    </FieldShell>
  );
}

function TextAreaField({ props, ...rest }: FieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>) {
  const { id, label, error, hint, required, ...inputProps } = rest as FieldProps &
    React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <Textarea {...inputProps} {...props} />
    </FieldShell>
  );
}

function SelectField({ props, children, ...rest }: FieldProps & { children: ReactNode }) {
  const { id, label, error, hint, required } = rest;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <NativeSelect {...props}>{children}</NativeSelect>
    </FieldShell>
  );
}
