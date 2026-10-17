/**
 * Row Level Security tests. They run against a disposable PostgreSQL database prepared by
 * scripts/test-db.sh (Supabase stub + migrations + seed). Run with: npm run test:db
 */
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DATABASE_URL = process.env.DATABASE_URL;

const ADMIN_ID = '00000000-0000-4000-8000-00000000a001';
const USER_ID = '00000000-0000-4000-8000-00000000b001';
const DRAFT_ID = 'a1f0c3d2-0005-4c1a-9b10-000000000005';
const PUBLIC_ID = 'a1f0c3d2-0001-4c1a-9b10-000000000001';

type Role = 'anon' | 'authenticated';

let client: Client;

/** Runs `fn` inside a transaction impersonating a Supabase API role, then rolls back. */
async function as<T>(role: Role, userId: string | null, fn: (c: Client) => Promise<T>): Promise<T> {
  await client.query('begin');
  try {
    await client.query(`set local role ${role}`);
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(userId ? { sub: userId, role } : { role }),
    ]);
    return await fn(client);
  } finally {
    await client.query('rollback');
  }
}

async function expectError(promise: Promise<unknown>, pattern: RegExp) {
  await expect(promise).rejects.toThrow(pattern);
}

describe.skipIf(!DATABASE_URL)('RLS policies', () => {
  beforeAll(async () => {
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    await client.query(
      `insert into auth.users (id, email) values ($1, 'admin@rivera-motors.example'), ($2, 'user@rivera-motors.example')
       on conflict do nothing`,
      [ADMIN_ID, USER_ID],
    );
    await client.query(
      `insert into public.admin_profiles (user_id, role, display_name) values ($1, 'owner', 'Test Admin') on conflict do nothing`,
      [ADMIN_ID],
    );
  });

  afterAll(async () => {
    await client?.end();
  });

  describe('anonymous visitor', () => {
    it('sees only published vehicles', async () => {
      const rows = await as('anon', null, async (c) => (await c.query('select id, status from public.vehicles')).rows);
      expect(rows.length).toBe(23);
      expect(rows.every((r) => ['available', 'pending', 'sold'].includes(r.status))).toBe(true);
      expect(rows.some((r) => r.id === DRAFT_ID)).toBe(false);
    });

    it('cannot read translations, damages or media of a draft', async () => {
      await as('anon', null, async (c) => {
        for (const table of ['vehicle_translations', 'vehicle_damages', 'vehicle_media']) {
          const { rowCount } = await c.query(`select 1 from public.${table} where vehicle_id = $1`, [DRAFT_ID]);
          expect(rowCount, table).toBe(0);
        }
        const { rowCount } = await c.query('select 1 from public.vehicle_translations where vehicle_id = $1', [
          PUBLIC_ID,
        ]);
        expect(rowCount).toBe(3);
      });
    });

    it('cannot read private vehicle data, audit logs or admin profiles', async () => {
      for (const table of ['vehicle_private_data', 'audit_logs', 'admin_profiles']) {
        await expectError(
          as('anon', null, (c) => c.query(`select * from public.${table}`)),
          /permission denied/,
        );
      }
    });

    it('cannot create, modify or delete vehicles', async () => {
      await expectError(
        as('anon', null, (c) => c.query(`insert into public.vehicles (slug, make, model) values ('x', 'X', 'Y')`)),
        /permission denied/,
      );
      await expectError(
        as('anon', null, (c) => c.query(`update public.vehicles set make = 'Hacked'`)),
        /permission denied/,
      );
      await expectError(
        as('anon', null, (c) => c.query(`delete from public.vehicles`)),
        /permission denied/,
      );
    });

    it('cannot call admin functions', async () => {
      await expectError(
        as('anon', null, (c) => c.query(`select public.save_vehicle('{}'::jsonb)`)),
        /permission denied/,
      );
    });

    it('can submit a contact message but not read messages', async () => {
      await as('anon', null, async (c) => {
        await c.query(
          `insert into public.contact_messages (name, email, message, privacy_consent) values ('Test', 'a@b.example', 'Hello, is the car still there?', true)`,
        );
        await expectError(c.query('select * from public.contact_messages'), /permission denied/);
      });
    });

    it('cannot submit a contact message without consent', async () => {
      await expectError(
        as('anon', null, (c) =>
          c.query(
            `insert into public.contact_messages (name, email, message, privacy_consent) values ('Test', 'a@b.example', 'Hello there, test', false)`,
          ),
        ),
        /violates/,
      );
    });

    it('hides withdrawn vehicles', async () => {
      await client.query('begin');
      try {
        await client.query(`update public.vehicles set status = 'withdrawn' where id = $1`, [PUBLIC_ID]);
        await client.query('set local role anon');
        const { rowCount } = await client.query('select 1 from public.vehicles where id = $1', [PUBLIC_ID]);
        expect(rowCount).toBe(0);
        const media = await client.query('select 1 from public.vehicle_media where vehicle_id = $1', [PUBLIC_ID]);
        expect(media.rowCount).toBe(0);
      } finally {
        await client.query('rollback');
      }
    });

    it('cannot upload to storage', async () => {
      await expectError(
        as('anon', null, (c) =>
          c.query(`insert into storage.objects (bucket_id, name) values ('vehicle-media', $1)`, [
            `${PUBLIC_ID}/x.webp`,
          ]),
        ),
        /row-level security/,
      );
    });
  });

  describe('authenticated user without admin profile', () => {
    it('sees only published vehicles and cannot write', async () => {
      await as('authenticated', USER_ID, async (c) => {
        const { rowCount } = await c.query('select 1 from public.vehicles');
        expect(rowCount).toBe(23);
        const priv = await c.query('select 1 from public.vehicle_private_data');
        expect(priv.rowCount).toBe(0);
      });
      await expectError(
        as('authenticated', USER_ID, (c) =>
          c.query(`insert into public.vehicles (slug, make, model) values ('x', 'X', 'Y')`),
        ),
        /row-level security/,
      );
      await expectError(
        as('authenticated', USER_ID, (c) => c.query(`select public.save_vehicle('{}'::jsonb)`)),
        /Not authorized/,
      );
      const updated = await as('authenticated', USER_ID, (c) =>
        c.query(`update public.vehicles set make = 'Hacked' where id = $1`, [PUBLIC_ID]),
      );
      expect(updated.rowCount).toBe(0);
    });

    it('cannot upload to storage', async () => {
      await expectError(
        as('authenticated', USER_ID, (c) =>
          c.query(`insert into storage.objects (bucket_id, name) values ('vehicle-media', $1)`, [
            `${PUBLIC_ID}/x.webp`,
          ]),
        ),
        /row-level security/,
      );
    });
  });

  describe('administrator', () => {
    it('reads drafts and private data', async () => {
      await as('authenticated', ADMIN_ID, async (c) => {
        const { rowCount } = await c.query('select 1 from public.vehicles');
        expect(rowCount).toBe(24);
        const priv = await c.query('select vin_private from public.vehicle_private_data where vehicle_id = $1', [
          DRAFT_ID,
        ]);
        expect(priv.rows[0]?.vin_private).toBeTruthy();
      });
    });

    it('creates a vehicle, cannot publish it without German content, then publishes it', async () => {
      await as('authenticated', ADMIN_ID, async (c) => {
        const payload = {
          status: 'draft',
          vehicle: { slug: 'test-car-2020', make: 'Test', model: 'Car', price_on_request: true },
          translations: { en: { title: 'Only English' } },
          damages: [{ category: 'body', area: 'front', severity: 'minor', description: 'Kratzer' }],
          private: { vin_private: 'TESTVIN0000000001' },
        };
        const created = await c.query('select public.save_vehicle($1::jsonb) as id', [JSON.stringify(payload)]);
        const id = created.rows[0].id as string;

        await c.query('savepoint before_publish');
        await expectError(
          c.query(`update public.vehicles set status = 'available' where id = $1`, [id]),
          /German title and damage summary are required/,
        );
        await c.query('rollback to savepoint before_publish');

        await c.query('select public.save_vehicle($1::jsonb)', [
          JSON.stringify({
            ...payload,
            id,
            status: 'available',
            translations: { de: { title: 'Testauto', damage_summary: 'Kratzer vorne' }, en: { title: 'Test car' } },
          }),
        ]);

        const v = await c.query(
          'select status, published_at, damage_categories, damage_summary from public.vehicles where id = $1',
          [id],
        );
        expect(v.rows[0].status).toBe('available');
        expect(v.rows[0].published_at).not.toBeNull();
        expect(v.rows[0].damage_categories).toEqual(['body']);
        expect(v.rows[0].damage_summary).toBe('Kratzer vorne');

        const logs = await c.query(
          'select action, actor_id from public.audit_logs where entity_id = $1 order by created_at, action',
          [id],
        );
        const actions = logs.rows.map((r) => r.action);
        expect(actions).toContain('vehicle.created');
        expect(actions).toContain('vehicle.published');
        expect(logs.rows.every((r) => r.actor_id === ADMIN_ID)).toBe(true);
      });
    });

    it('keeps exactly one primary image per vehicle', async () => {
      await as('authenticated', ADMIN_ID, async (c) => {
        const media = await c.query(
          `insert into public.vehicle_media (vehicle_id, storage_path, sort_order) values ($1, $2, 1) returning id`,
          [PUBLIC_ID, `${PUBLIC_ID}/second.webp`],
        );
        await c.query('select public.set_primary_media($1)', [media.rows[0].id]);
        const primaries = await c.query('select id from public.vehicle_media where vehicle_id = $1 and is_primary', [
          PUBLIC_ID,
        ]);
        expect(primaries.rows).toEqual([{ id: media.rows[0].id }]);
      });
    });

    it('duplicates a vehicle as a draft without media or public VIN', async () => {
      await as('authenticated', ADMIN_ID, async (c) => {
        const { rows } = await c.query('select public.duplicate_vehicle($1) as id', [PUBLIC_ID]);
        const copy = await c.query('select status, vin_public, slug from public.vehicles where id = $1', [rows[0].id]);
        expect(copy.rows[0].status).toBe('draft');
        expect(copy.rows[0].vin_public).toBeNull();
        expect(copy.rows[0].slug).toMatch(/^bmw-118i-2018-copy-/);
        const tr = await c.query('select count(*)::int as n from public.vehicle_translations where vehicle_id = $1', [
          rows[0].id,
        ]);
        expect(tr.rows[0].n).toBe(3);
      });
    });

    it('can upload to storage only inside a vehicle folder', async () => {
      await as('authenticated', ADMIN_ID, async (c) => {
        await c.query(`insert into storage.objects (bucket_id, name) values ('vehicle-media', $1)`, [
          `${PUBLIC_ID}/a.webp`,
        ]);
        await expectError(
          c.query(`insert into storage.objects (bucket_id, name) values ('vehicle-media', 'not-a-uuid/a.webp')`),
          /row-level security/,
        );
      });
    });

    it('reads contact messages and the audit log', async () => {
      await as('authenticated', ADMIN_ID, async (c) => {
        await c.query('select * from public.contact_messages');
        await c.query('select * from public.audit_logs');
      });
    });

    it('cannot write audit logs directly', async () => {
      await expectError(
        as('authenticated', ADMIN_ID, (c) =>
          c.query(`insert into public.audit_logs (action, entity_type) values ('fake', 'vehicle')`),
        ),
        /permission denied/,
      );
    });
  });
});
