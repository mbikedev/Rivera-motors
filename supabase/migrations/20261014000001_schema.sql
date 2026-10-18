-- Rivera Motors – damaged vehicle catalogue
-- Core schema: vehicles, translations, damages, media, settings, admins, audit log, contact messages.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------------

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  make text not null check (char_length(make) between 1 and 60),
  model text not null check (char_length(model) between 1 and 80),
  variant text check (char_length(variant) <= 120),
  manufacture_year integer check (manufacture_year between 1900 and 2100),
  first_registration_date date,
  mileage_km integer check (mileage_km >= 0),
  fuel_type text check (fuel_type in ('petrol','diesel','hybrid','plugin_hybrid','electric','lpg','cng','hydrogen','other')),
  transmission text check (transmission in ('manual','automatic','semi_automatic')),
  engine_cc integer check (engine_cc > 0),
  power_kw integer check (power_kw > 0),
  body_type text check (body_type in ('sedan','hatchback','estate','suv','coupe','convertible','van','pickup','minivan','other')),
  doors integer check (doors between 1 and 9),
  seats integer check (seats between 1 and 60),
  color text check (char_length(color) <= 60),
  euro_standard text check (char_length(euro_standard) <= 20),
  co2_emissions_g_km integer check (co2_emissions_g_km >= 0),
  -- Public VIN is optional and may be partially masked by the admin. The full VIN lives in vehicle_private_data.
  vin_public text check (char_length(vin_public) <= 17),
  origin_country text check (char_length(origin_country) <= 60),
  documents_available text,
  service_history text,
  technical_inspection text,
  asking_price_eur numeric(12,2) check (asking_price_eur is null or asking_price_eur >= 0),
  price_on_request boolean not null default true,
  starts boolean,
  drivable boolean,
  -- German master copy of the editorial texts (mirrors vehicle_translations where locale = 'de').
  damage_summary text,
  damage_details text,
  diagnosis_notes text,
  repair_notes text,
  missing_parts text,
  damage_assessed_at date,
  -- Denormalised list of damage categories, maintained by trigger, used for catalogue filtering.
  damage_categories text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','available','pending','sold','withdrawn')),
  published_at timestamptz,
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.vehicles is 'Damaged vehicles shown in the public catalogue. Only available/pending/sold rows are public.';

create index vehicles_status_published_idx on public.vehicles (status, published_at desc);
create index vehicles_make_model_idx on public.vehicles (lower(make), lower(model));
create index vehicles_year_idx on public.vehicles (manufacture_year);
create index vehicles_mileage_idx on public.vehicles (mileage_km);
create index vehicles_price_idx on public.vehicles (asking_price_eur);
create index vehicles_damage_categories_idx on public.vehicles using gin (damage_categories);

create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

-- Strictly internal data (full VIN, internal notes). Never readable by visitors.
create table public.vehicle_private_data (
  vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
  vin_private text check (char_length(vin_private) <= 17),
  internal_notes text,
  updated_at timestamptz not null default now()
);

create trigger vehicle_private_data_set_updated_at
before update on public.vehicle_private_data
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vehicle_translations
-- ---------------------------------------------------------------------------

create table public.vehicle_translations (
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  locale text not null check (locale in ('de','en','fr')),
  title text check (char_length(title) <= 160),
  damage_summary text,
  damage_details text,
  diagnosis_notes text,
  repair_notes text,
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  updated_at timestamptz not null default now(),
  primary key (vehicle_id, locale)
);

create trigger vehicle_translations_set_updated_at
before update on public.vehicle_translations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vehicle_damages
-- ---------------------------------------------------------------------------

create table public.vehicle_damages (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  category text not null check (category in ('body','engine','gearbox','electrical','chassis','flood','other')),
  area text check (area in (
    'front','rear','left','right','front_left','front_right','rear_left','rear_right',
    'hood','roof','bumper_front','bumper_rear','doors','underbody','interior','engine_bay',
    'wheels','windows','trunk','other'
  )),
  -- Informative only. Severity never implies road safety.
  severity text check (severity in ('minor','moderate','severe')),
  description text,
  -- Optional translations of the description: {"en": "...", "fr": "..."}
  translations jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index vehicle_damages_vehicle_idx on public.vehicle_damages (vehicle_id, sort_order);

-- Keep vehicles.damage_categories in sync.
create or replace function public.refresh_damage_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.vehicle_id, old.vehicle_id);
begin
  update public.vehicles v
     set damage_categories = coalesce(
       (select array_agg(distinct d.category order by d.category)
          from public.vehicle_damages d
         where d.vehicle_id = target),
       '{}')
   where v.id = target;
  if tg_op = 'UPDATE' and old.vehicle_id is distinct from new.vehicle_id then
    update public.vehicles v
       set damage_categories = coalesce(
         (select array_agg(distinct d.category order by d.category)
            from public.vehicle_damages d
           where d.vehicle_id = old.vehicle_id),
         '{}')
     where v.id = old.vehicle_id;
  end if;
  return null;
end;
$$;

create trigger vehicle_damages_refresh_categories
after insert or update or delete on public.vehicle_damages
for each row execute function public.refresh_damage_categories();

-- ---------------------------------------------------------------------------
-- vehicle_media
-- ---------------------------------------------------------------------------

create table public.vehicle_media (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  -- Path inside the "vehicle-media" bucket ("<vehicle_id>/<uuid>.webp"),
  -- or an absolute/site-relative URL for demo assets ("/demo/...").
  storage_path text not null check (char_length(storage_path) <= 500),
  media_type text not null default 'image' check (media_type in ('image','video')),
  alt_text text check (char_length(alt_text) <= 300),
  caption text check (char_length(caption) <= 300),
  is_damage_view boolean not null default false,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index vehicle_media_vehicle_idx on public.vehicle_media (vehicle_id, sort_order);
-- At most one primary image per vehicle.
create unique index vehicle_media_one_primary_idx on public.vehicle_media (vehicle_id) where is_primary;

-- ---------------------------------------------------------------------------
-- site_settings
-- ---------------------------------------------------------------------------

create table public.site_settings (
  key text primary key check (key in ('company','contact','opening_hours','visit','home','features','legal')),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- admin_profiles (provisioned privately, no public sign-up)
-- ---------------------------------------------------------------------------

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner','editor')),
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- contact_messages (simple public contact form, no account)
-- ---------------------------------------------------------------------------

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text check (email is null or (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (char_length(phone) <= 40),
  message text not null check (char_length(message) between 10 and 4000),
  vehicle_slug text check (char_length(vehicle_slug) <= 120),
  locale text not null default 'de' check (locale in ('de','en','fr')),
  privacy_consent boolean not null check (privacy_consent),
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);

create index contact_messages_created_idx on public.contact_messages (created_at desc);
