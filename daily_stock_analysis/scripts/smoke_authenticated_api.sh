#!/bin/sh
set -eu

: "${DSA_SMOKE_BASE_URL:?Set DSA_SMOKE_BASE_URL to the engine URL}"
: "${DSA_SMOKE_PASSWORD:?Set DSA_SMOKE_PASSWORD without printing it}"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT HUP INT TERM
cookie_jar="$probe_dir/cookies"
login_body="$probe_dir/login.json"

python -c 'import json, os, sys; json.dump({"password": os.environ["DSA_SMOKE_PASSWORD"]}, sys.stdout)' >"$login_body"

started_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
unauth_status="$(curl -sS -o "$probe_dir/unauth.json" -w '%{http_code}' \
  "$DSA_SMOKE_BASE_URL/api/v1/system/scheduler/status")"
login_status="$(curl -sS -o "$probe_dir/login-response.json" -w '%{http_code}' \
  -c "$cookie_jar" -H 'Content-Type: application/json' \
  --data-binary "@$login_body" "$DSA_SMOKE_BASE_URL/api/v1/auth/login")"
auth_status="$(curl -sS -o "$probe_dir/auth.json" -w '%{http_code}' \
  -b "$cookie_jar" "$DSA_SMOKE_BASE_URL/api/v1/system/scheduler/status")"
finished_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

printf 'probe_started_utc=%s\n' "$started_utc"
printf 'unauthenticated_protected_status=%s\n' "$unauth_status"
printf 'administrator_login_status=%s\n' "$login_status"
printf 'authenticated_protected_status=%s\n' "$auth_status"
printf 'probe_finished_utc=%s\n' "$finished_utc"

[ "$unauth_status" = "401" ]
[ "$login_status" = "200" ]
[ "$auth_status" = "200" ]
