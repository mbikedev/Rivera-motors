import { z } from 'zod';
import { WEEKDAYS } from '@/lib/data/constants';

const time = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'invalidNumber')
    .nullable(),
);
const coordinate = (limit: number) =>
  z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? null : Number(String(v).replace(',', '.'))),
    z.number('invalidNumber').min(-limit, 'invalidNumber').max(limit, 'invalidNumber').nullable(),
  );
const required = (max: number) => z.string().trim().min(1, 'required').max(max);
const optional = (max: number) => z.string().trim().max(max).default('');
const localized = z.object({ de: optional(1000), en: optional(1000), fr: optional(1000) });

/** Site settings edited in the admin area; keys match public.site_settings. */
export const settingsSchema = z.object({
  company: z.object({ name: required(80), legalName: required(120), isDemo: z.boolean() }),
  contact: z.object({
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()/-]{4,30}$/, 'invalidNumber'),
    phoneDisplay: required(40),
    email: z.email('required'),
    street: required(120),
    postalCode: required(12),
    city: required(80),
    country: required(60),
    latitude: coordinate(90),
    longitude: coordinate(180),
  }),
  opening_hours: z.array(z.object({ day: z.enum(WEEKDAYS), open: time, close: time })).length(7),
  visit: z.object({ appointmentRequired: z.boolean(), notes: localized, parking: localized }),
  home: z.object({ heroTitle: localized, heroSubtitle: localized }),
  features: z.object({ contactForm: z.boolean() }),
  legal: z.object({
    managingDirector: optional(120),
    registerCourt: optional(120),
    registerNumber: optional(60),
    vatId: optional(40),
    responsibleForContent: optional(120),
  }),
});

export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsValues = z.output<typeof settingsSchema>;
