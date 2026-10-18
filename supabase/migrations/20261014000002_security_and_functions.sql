-- Access control (RLS), publication rules, audit logging and admin RPCs.

-- ---------------------------------------------------------------------------
-- Admin check
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles p where p.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.is_public_status(s text)
returns boolean
language sql
immutable
as $$
  select s in ('available','pending','sold');
$$;

-- A vehicle is visible to visitors only when it has a public status and was published.
create or replace function public.vehicle_is_public(v_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vehicles v
     where v.id = v_id
       and public.is_public_status(v.status)
       and v.published_at is not null
  );
$$;

revoke all on function public.vehicle_is_public(uuid) from public;
grant execute on function public.vehicle_is_public(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Publication rules
-- ---------------------------------------------------------------------------

alter table public.vehicles
  add constraint vehicles_price_consistency
  check (price_on_request or asking_price_eur is not null);

create or replace function public.vehicles_before_write()
returns trigger
language plpgsql
as $$
begin
  if public.is_public_status(new.status) then
    -- German content is required before a vehicle can be published.
    if not exists (
      select 1 from public.vehicle_translations t
       where t.vehicle_id = new.id
         and t.locale = 'de'
         and coalesce(btrim(t.title), '') <> ''
         and coalesce(btrim(t.damage_summary), '') <> ''
    ) then
      raise exception 'German title and damage summary are required before publishing'
        using errcode = 'P0001', hint = 'missing_german_content';
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger vehicles_before_write
before insert or update of status on public.vehicles
for each row execute function public.vehicles_before_write();

-- ---------------------------------------------------------------------------
-- Audit logging (written by triggers, never by clients)
-- ---------------------------------------------------------------------------

create or replace function public.write_audit_log(
  p_action text, p_entity_type text, p_entity_id uuid, p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

revoke all on function public.write_audit_log(text, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.audit_vehicles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed text[];
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log('vehicle.created', 'vehicle', new.id,
      jsonb_build_object('slug', new.slug, 'status', new.status));
    return new;
  elsif tg_op = 'DELETE' then
    perform public.write_audit_log('vehicle.deleted', 'vehicle', old.id,
      jsonb_build_object('slug', old.slug, 'status', old.status));
    return old;
  end if;

  if new.status is distinct from old.status then
    perform public.write_audit_log(
      case
        when public.is_public_status(new.status) and not public.is_public_status(old.status) then 'vehicle.published'
        when not public.is_public_status(new.status) and public.is_public_status(old.status) then 'vehicle.unpublished'
        else 'vehicle.status_changed'
      end,
      'vehicle', new.id,
      jsonb_build_object('slug', new.slug, 'from', old.status, 'to', new.status));
  end if;

  select coalesce(array_agg(n.key order by n.key), '{}')
    into changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
   where n.value is distinct from o.value
     and n.key not in ('updated_at', 'damage_categories', 'status', 'published_at');

  if array_length(changed, 1) > 0 then
    perform public.write_audit_log('vehicle.updated', 'vehicle', new.id,
      jsonb_build_object('slug', new.slug, 'fields', to_jsonb(changed)));
  end if;
  return new;
end;
$$;

create trigger vehicles_audit
after insert or update or delete on public.vehicles
for each row execute function public.audit_vehicles();

create or replace function public.audit_vehicle_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log('media.added', 'vehicle', new.vehicle_id,
      jsonb_build_object('media_id', new.id, 'type', new.media_type));
    return new;
  elsif tg_op = 'DELETE' then
    -- Skip cascaded deletes of a vehicle (already logged as vehicle.deleted).
    if exists (select 1 from public.vehicles where id = old.vehicle_id) then
      perform public.write_audit_log('media.deleted', 'vehicle', old.vehicle_id,
        jsonb_build_object('media_id', old.id, 'storage_path', old.storage_path));
    end if;
    return old;
  end if;
  return new;
end;
$$;

create trigger vehicle_media_audit
after insert or delete on public.vehicle_media
for each row execute function public.audit_vehicle_media();

create or replace function public.audit_site_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_log('settings.updated', 'site_settings', null,
    jsonb_build_object('key', new.key));
  return new;
end;
$$;

create trigger site_settings_audit
after insert or update on public.site_settings
for each row execute function public.audit_site_settings();

create or replace function public.audit_contact_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_log('contact_message.deleted', 'contact_message', old.id, '{}'::jsonb);
  return old;
end;
$$;

create trigger contact_messages_audit
after delete on public.contact_messages
for each row execute function public.audit_contact_messages();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.vehicles enable row level security;
alter table public.vehicle_private_data enable row level security;
alter table public.vehicle_translations enable row level security;
alter table public.vehicle_damages enable row level security;
alter table public.vehicle_media enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.contact_messages enable row level security;

-- vehicles
create policy "Visitors read published vehicles" on public.vehicles
  for select to anon, authenticated
  using (public.is_public_status(status) and published_at is not null);
create policy "Admins read all vehicles" on public.vehicles
  for select to authenticated using (public.is_admin());
create policy "Admins insert vehicles" on public.vehicles
  for insert to authenticated with check (public.is_admin());
create policy "Admins update vehicles" on public.vehicles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete vehicles" on public.vehicles
  for delete to authenticated using (public.is_admin());

-- vehicle_private_data: admins only
create policy "Admins manage private vehicle data" on public.vehicle_private_data
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- vehicle_translations / vehicle_damages / vehicle_media follow the parent vehicle
create policy "Visitors read translations of published vehicles" on public.vehicle_translations
  for select to anon, authenticated using (public.vehicle_is_public(vehicle_id));
create policy "Admins manage translations" on public.vehicle_translations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Visitors read damages of published vehicles" on public.vehicle_damages
  for select to anon, authenticated using (public.vehicle_is_public(vehicle_id));
create policy "Admins manage damages" on public.vehicle_damages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Visitors read media of published vehicles" on public.vehicle_media
  for select to anon, authenticated using (public.vehicle_is_public(vehicle_id));
create policy "Admins manage media" on public.vehicle_media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- site_settings: public read, admin write
create policy "Everyone reads site settings" on public.site_settings
  for select to anon, authenticated using (true);
create policy "Admins manage site settings" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin_profiles: a user may read their own profile; admins read all. Provisioning happens via SQL only.
create policy "Users read own admin profile" on public.admin_profiles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- audit_logs: admins read only. Rows are written by security-definer triggers.
create policy "Admins read audit logs" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- contact_messages: anyone may submit, only admins read/delete.
create policy "Anyone submits contact messages" on public.contact_messages
  for insert to anon, authenticated with check (privacy_consent);
create policy "Admins read contact messages" on public.contact_messages
  for select to authenticated using (public.is_admin());
create policy "Admins delete contact messages" on public.contact_messages
  for delete to authenticated using (public.is_admin());

-- Defence in depth on top of RLS: remove privileges visitors never need.
revoke all on public.vehicle_private_data, public.audit_logs, public.admin_profiles from anon;
revoke insert, update, delete, truncate on public.vehicles, public.vehicle_translations,
  public.vehicle_damages, public.vehicle_media, public.site_settings from anon;
revoke update, delete, truncate on public.contact_messages from anon;
revoke select on public.contact_messages from anon;
revoke insert, update, delete, truncate on public.audit_logs, public.admin_profiles from authenticated;

-- ---------------------------------------------------------------------------
-- Admin RPCs (security invoker: RLS still applies, plus explicit admin check)
-- ---------------------------------------------------------------------------

create or replace function public.assert_admin()
returns void
language plpgsql
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
end;
$$;

-- Creates or updates a vehicle with its translations, damages and private data in one transaction.
-- Payload: { id?, status, vehicle: {...columns}, translations: {de: {...}, en: {...}, fr: {...}},
--            damages: [{category, area, severity, description, translations}], private: {vin_private, internal_notes} }
create or replace function public.save_vehicle(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_status text := coalesce(nullif(p->>'status', ''), 'draft');
  r public.vehicles;
begin
  perform public.assert_admin();

  r := jsonb_populate_record(null::public.vehicles, coalesce(p->'vehicle', '{}'::jsonb));

  if v_id is null then
    insert into public.vehicles (
      slug, make, model, variant, manufacture_year, first_registration_date, mileage_km, fuel_type,
      transmission, engine_cc, power_kw, body_type, doors, seats, color, euro_standard, co2_emissions_g_km,
      vin_public, origin_country, documents_available, service_history, technical_inspection,
      asking_price_eur, price_on_request, starts, drivable, missing_parts, damage_assessed_at, status
    ) values (
      r.slug, r.make, r.model, r.variant, r.manufacture_year, r.first_registration_date, r.mileage_km, r.fuel_type,
      r.transmission, r.engine_cc, r.power_kw, r.body_type, r.doors, r.seats, r.color, r.euro_standard, r.co2_emissions_g_km,
      r.vin_public, r.origin_country, r.documents_available, r.service_history, r.technical_inspection,
      r.asking_price_eur, coalesce(r.price_on_request, true), r.starts, r.drivable, r.missing_parts, r.damage_assessed_at, 'draft'
    )
    returning id into v_id;
  else
    update public.vehicles set
      slug = r.slug, make = r.make, model = r.model, variant = r.variant,
      manufacture_year = r.manufacture_year, first_registration_date = r.first_registration_date,
      mileage_km = r.mileage_km, fuel_type = r.fuel_type, transmission = r.transmission,
      engine_cc = r.engine_cc, power_kw = r.power_kw, body_type = r.body_type, doors = r.doors,
      seats = r.seats, color = r.color, euro_standard = r.euro_standard,
      co2_emissions_g_km = r.co2_emissions_g_km, vin_public = r.vin_public,
      origin_country = r.origin_country, documents_available = r.documents_available,
      service_history = r.service_history, technical_inspection = r.technical_inspection,
      asking_price_eur = r.asking_price_eur, price_on_request = coalesce(r.price_on_request, true),
      starts = r.starts, drivable = r.drivable, missing_parts = r.missing_parts,
      damage_assessed_at = r.damage_assessed_at
    where id = v_id;
    if not found then
      raise exception 'Vehicle not found' using errcode = 'P0002';
    end if;
  end if;

  -- Translations: upsert provided locales, remove locales no longer provided (German is kept).
  delete from public.vehicle_translations t
   where t.vehicle_id = v_id
     and t.locale <> 'de'
     and not (coalesce(p->'translations', '{}'::jsonb) ? t.locale);

  insert into public.vehicle_translations as t (
    vehicle_id, locale, title, damage_summary, damage_details, diagnosis_notes, repair_notes, seo_title, seo_description
  )
  select v_id, e.key, x.title, x.damage_summary, x.damage_details, x.diagnosis_notes, x.repair_notes, x.seo_title, x.seo_description
    from jsonb_each(coalesce(p->'translations', '{}'::jsonb)) e
    cross join lateral jsonb_populate_record(null::public.vehicle_translations, e.value) x
  on conflict (vehicle_id, locale) do update set
    title = excluded.title,
    damage_summary = excluded.damage_summary,
    damage_details = excluded.damage_details,
    diagnosis_notes = excluded.diagnosis_notes,
    repair_notes = excluded.repair_notes,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description;

  -- Mirror the German master copy onto the vehicle row.
  update public.vehicles v set
    damage_summary = t.damage_summary,
    damage_details = t.damage_details,
    diagnosis_notes = t.diagnosis_notes,
    repair_notes = t.repair_notes,
    seo_title = t.seo_title,
    seo_description = t.seo_description
  from public.vehicle_translations t
  where v.id = v_id and t.vehicle_id = v_id and t.locale = 'de';

  -- Damages are replaced as a whole.
  if p ? 'damages' then
    delete from public.vehicle_damages where vehicle_id = v_id;
    insert into public.vehicle_damages (vehicle_id, category, area, severity, description, translations, sort_order)
    select v_id,
           d.value->>'category',
           nullif(d.value->>'area', ''),
           nullif(d.value->>'severity', ''),
           nullif(d.value->>'description', ''),
           coalesce(d.value->'translations', '{}'::jsonb),
           (d.ordinality - 1)::int
      from jsonb_array_elements(p->'damages') with ordinality as d(value, ordinality);
  end if;

  if p ? 'private' then
    insert into public.vehicle_private_data (vehicle_id, vin_private, internal_notes)
    values (v_id, nullif(p->'private'->>'vin_private', ''), nullif(p->'private'->>'internal_notes', ''))
    on conflict (vehicle_id) do update set
      vin_private = excluded.vin_private,
      internal_notes = excluded.internal_notes;
  end if;

  update public.vehicles set status = v_status where id = v_id and status is distinct from v_status;

  return v_id;
end;
$$;

create or replace function public.duplicate_vehicle(p_source uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid;
  src public.vehicles;
begin
  perform public.assert_admin();
  select * into src from public.vehicles where id = p_source;
  if not found then
    raise exception 'Vehicle not found' using errcode = 'P0002';
  end if;

  insert into public.vehicles (
    slug, make, model, variant, manufacture_year, first_registration_date, mileage_km, fuel_type,
    transmission, engine_cc, power_kw, body_type, doors, seats, color, euro_standard, co2_emissions_g_km,
    vin_public, origin_country, documents_available, service_history, technical_inspection,
    asking_price_eur, price_on_request, starts, drivable, damage_summary, damage_details, diagnosis_notes,
    repair_notes, missing_parts, damage_assessed_at, seo_title, seo_description, status
  )
  select left(src.slug, 100) || '-copy-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
    make, model, variant, manufacture_year, first_registration_date, mileage_km, fuel_type,
    transmission, engine_cc, power_kw, body_type, doors, seats, color, euro_standard, co2_emissions_g_km,
    null, origin_country, documents_available, service_history, technical_inspection,
    asking_price_eur, price_on_request, starts, drivable, damage_summary, damage_details, diagnosis_notes,
    repair_notes, missing_parts, damage_assessed_at, seo_title, seo_description, 'draft'
  from public.vehicles where id = p_source
  returning id into new_id;

  insert into public.vehicle_translations (vehicle_id, locale, title, damage_summary, damage_details, diagnosis_notes, repair_notes, seo_title, seo_description)
  select new_id, locale, title, damage_summary, damage_details, diagnosis_notes, repair_notes, seo_title, seo_description
    from public.vehicle_translations where vehicle_id = p_source;

  insert into public.vehicle_damages (vehicle_id, category, area, severity, description, translations, sort_order)
  select new_id, category, area, severity, description, translations, sort_order
    from public.vehicle_damages where vehicle_id = p_source;

  return new_id;
end;
$$;

create or replace function public.set_primary_media(p_media_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.assert_admin();
  select vehicle_id into v_id from public.vehicle_media where id = p_media_id;
  if v_id is null then
    raise exception 'Media not found' using errcode = 'P0002';
  end if;
  update public.vehicle_media set is_primary = false where vehicle_id = v_id and is_primary;
  update public.vehicle_media set is_primary = true where id = p_media_id;
end;
$$;

create or replace function public.reorder_media(p_vehicle_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.assert_admin();
  update public.vehicle_media m
     set sort_order = array_position(p_ids, m.id) - 1
   where m.vehicle_id = p_vehicle_id
     and m.id = any (p_ids);
end;
$$;

-- GDPR retention: delete contact messages older than the given interval (default 12 months).
create or replace function public.purge_old_contact_messages(p_older_than interval default interval '12 months')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  delete from public.contact_messages where created_at < now() - p_older_than;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.save_vehicle(jsonb) from public, anon;
revoke all on function public.duplicate_vehicle(uuid) from public, anon;
revoke all on function public.set_primary_media(uuid) from public, anon;
revoke all on function public.reorder_media(uuid, uuid[]) from public, anon;
revoke all on function public.purge_old_contact_messages(interval) from public, anon;
grant execute on function public.save_vehicle(jsonb) to authenticated;
grant execute on function public.duplicate_vehicle(uuid) to authenticated;
grant execute on function public.set_primary_media(uuid) to authenticated;
grant execute on function public.reorder_media(uuid, uuid[]) to authenticated;
grant execute on function public.purge_old_contact_messages(interval) to authenticated;
