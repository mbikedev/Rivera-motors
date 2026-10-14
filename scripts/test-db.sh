#!/usr/bin/env bash
# Runs the database (RLS) tests.
# - If DATABASE_URL is set, migrations are applied to that (disposable!) database.
# - Otherwise a throw-away local PostgreSQL cluster is started (requires initdb/pg_ctl in PATH
#   or under /usr/lib/postgresql/*/bin).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  PG_BIN="$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | tail -1)")"
  TMP="$(mktemp -d)"
  RUN_AS=()
  if [[ "$(id -u)" == "0" ]]; then
    # PostgreSQL refuses to run as root; use an unprivileged account.
    PG_USER="$(getent passwd | awk -F: '$3>=1000 && $3<65534 {print $1; exit}')"
    chown -R "$PG_USER" "$TMP"
    RUN_AS=(su "$PG_USER" -s /bin/bash -c)
  fi
  run() { if [[ ${#RUN_AS[@]} -gt 0 ]]; then "${RUN_AS[@]}" "$*"; else bash -c "$*"; fi; }
  PORT="${PGPORT_TEST:-54329}"
  run "$PG_BIN/initdb -D $TMP/data -U postgres -A trust >/dev/null"
  run "$PG_BIN/pg_ctl -D $TMP/data -o '-p $PORT -k $TMP -c listen_addresses=127.0.0.1' -l $TMP/log -w start >/dev/null"
  trap 'run "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null"; rm -rf "$TMP"' EXIT
  export DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/postgres"
fi

PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/tests/db/supabase-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"

cd "$ROOT"
npx vitest run --config vitest.db.config.mts
