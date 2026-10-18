import { z } from 'zod';
import { LOCALES } from '@/i18n/locales';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Error messages are translation keys under contact.errors.* */
export const contactSchema = z
  .object({
    name: z.string().trim().min(2, 'name').max(120, 'name'),
    email: optionalText(200).pipe(z.email('email').optional()),
    phone: optionalText(40),
    message: z.string().trim().min(10, 'message').max(4000, 'message'),
    vehicle: optionalText(120),
    locale: z.enum(LOCALES).default('de'),
    privacyConsent: z.literal(true, 'consent'),
    // Anti-spam: honeypot must stay empty, form must not be submitted instantly.
    website: z.string().max(0).optional(),
    startedAt: z.coerce.number().optional(),
  })
  .refine((v) => Boolean(v.email || v.phone), { message: 'contact', path: ['email'] });

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;

export const MIN_FILL_MS = 3000;
