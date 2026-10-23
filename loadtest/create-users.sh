#!/usr/bin/env bash
# Creates N regular users (via root invite flow) and writes their keys to users.json.
# Usage: BASE_URL=http://localhost:16732 [ROOT_KEY=...] [USERS=10] ./create-users.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:16732}"
USERS="${USERS:-10}"
OUT="${OUT:-$(dirname "$0")/users.json}"
SUFFIX="$(date +%s | tail -c 6)"

if [[ -z "${ROOT_KEY:-}" ]]; then
    ROOT_KEY="$(curl -sf -X POST "$BASE_URL/api/initial" \
        -H 'Content-Type: application/json' \
        -d '{"rootUsername":"lt_root"}' | jq -r '.key // empty')"
    [[ -n "$ROOT_KEY" ]] || { echo "Initial setup failed (server already set up? pass ROOT_KEY)" >&2; exit 1; }
    echo "Initial setup done, root key: $ROOT_KEY" >&2
fi

users="[]"
for i in $(seq 1 "$USERS"); do
    name="lt_user_${SUFFIX}_${i}"
    code="$(curl -sfG "$BASE_URL/api/private/invites/new" \
        --data-urlencode "key=$ROOT_KEY" --data-urlencode "target=$name" | jq -r '.data.inviteCode // empty')"
    [[ -n "$code" ]] || { echo "Invite for $name failed" >&2; exit 1; }
    key="$(curl -sfG "$BASE_URL/api/private/invites/use" \
        --data-urlencode "code=$code" | jq -r '.data.accessKey // empty')"
    [[ -n "$key" ]] || { echo "Invite use for $name failed" >&2; exit 1; }
    users="$(jq --arg n "$name" --arg k "$key" '. + [{username: $n, key: $k}]' <<<"$users")"
    echo "Created $name" >&2
done

jq --arg r "$ROOT_KEY" '{rootKey: $r, users: .}' <<<"$users" > "$OUT"
echo "Wrote $USERS users to $OUT" >&2
