'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label, Textarea } from '@/components/ui/input';
import type { Locale } from '@/i18n/locales';
import { contactSchema, type ContactData, type ContactInput } from '@/lib/validation/contact';

type ErrorKey = 'name' | 'email' | 'contact' | 'message' | 'consent';
const ERROR_KEYS: ErrorKey[] = ['name', 'email', 'contact', 'message', 'consent'];

export function ContactForm({ privacyLink, vehicle }: { privacyLink: ReactNode; vehicle?: string }) {
  const t = useTranslations('contact');
  const locale = useLocale() as Locale;
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'rateLimited' | 'unavailable'>('idle');
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput, unknown, ContactData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { locale, vehicle: vehicle ?? '', website: '' },
  });

  useEffect(() => {
    setValue('startedAt', Date.now());
  }, [setValue]);

  const errorText = (message?: string) =>
    message && ERROR_KEYS.includes(message as ErrorKey) ? t(`errors.${message as ErrorKey}`) : undefined;

  async function onSubmit(data: ContactData) {
    setStatus('idle');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        setStatus('success');
        reset({ locale, vehicle: '', website: '' });
        return;
      }
      setStatus(response.status === 429 ? 'rateLimited' : response.status === 503 ? 'unavailable' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex gap-3 rounded-xl border border-green-300 bg-green-50 p-5 text-green-950" role="status">
        <CheckCircle2 className="size-6 shrink-0" aria-hidden />
        <p>{t('success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <Label htmlFor="contact-name">{t('name')} *</Label>
        <Input
          id="contact-name"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'contact-name-error' : undefined}
          className="mt-1"
          {...register('name')}
        />
        <FieldError id="contact-name-error">{errorText(errors.name?.message)}</FieldError>
      </div>
      <p className="text-muted-foreground text-sm">{t('contactHint')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-email">{t('email')}</Label>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'contact-email-error' : undefined}
            className="mt-1"
            {...register('email')}
          />
          <FieldError id="contact-email-error">{errorText(errors.email?.message)}</FieldError>
        </div>
        <div>
          <Label htmlFor="contact-phone">{t('phone')}</Label>
          <Input id="contact-phone" type="tel" autoComplete="tel" className="mt-1" {...register('phone')} />
        </div>
      </div>
      <div>
        <Label htmlFor="contact-vehicle">{t('vehicle')}</Label>
        <Input id="contact-vehicle" className="mt-1" {...register('vehicle')} />
      </div>
      <div>
        <Label htmlFor="contact-message">{t('message')} *</Label>
        <Textarea
          id="contact-message"
          rows={6}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'contact-message-error' : undefined}
          className="mt-1"
          {...register('message')}
        />
        <FieldError id="contact-message-error">{errorText(errors.message?.message)}</FieldError>
      </div>
      {/* Honeypot – hidden from people and assistive technology */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">{t('honeypot')}</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>
      <input type="hidden" {...register('startedAt')} />
      <input type="hidden" {...register('locale')} />
      <div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-[var(--primary)]"
            aria-invalid={Boolean(errors.privacyConsent)}
            aria-describedby={errors.privacyConsent ? 'contact-consent-error' : undefined}
            {...register('privacyConsent')}
          />
          <span>
            {t('consent')} ({privacyLink})
          </span>
        </label>
        <FieldError id="contact-consent-error">{errorText(errors.privacyConsent?.message)}</FieldError>
      </div>
      {status !== 'idle' ? (
        <p className="text-destructive text-sm" role="alert">
          {t(status === 'rateLimited' ? 'rateLimited' : status === 'unavailable' ? 'unavailable' : 'error')}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('sending') : t('submit')}
      </Button>
    </form>
  );
}
