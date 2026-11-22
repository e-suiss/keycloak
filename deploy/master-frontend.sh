#!/usr/bin/env bash
# The admin console authenticates against the master realm through that realm's frontend URL.
# With /realms/master/ closed on the public hostname (reverseproxy guide), the master realm's
# frontend URL is the admin hostname, so the console's login and its 3p-cookie iframe stay there.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
admin="${KC_ADMIN_HOST:-admin.auth.localhost}"
c() { curl -sf --cacert deploy/tls/ca.crt --resolve "$admin:${KC_PROXY_PORT:-443}:127.0.0.1" "$@"; }
base="https://$admin:${KC_PROXY_PORT:-443}"
for _ in $(seq 60); do c -o /dev/null "$base/realms/master/.well-known/openid-configuration" && break; sleep 2; done
token=$(c -d client_id=admin-cli -d "username=$KC_BOOTSTRAP_ADMIN_USERNAME" \
  -d "password=$KC_BOOTSTRAP_ADMIN_PASSWORD" -d grant_type=password \
  "$base/realms/master/protocol/openid-connect/token" | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
c -X PUT -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
  -d "{\"attributes\":{\"frontendUrl\":\"https://$admin\"}}" "$base/admin/realms/master"

# suiss's own admin console signs in like master (username + password, Keycloak's built-in
# "browser" flow) instead of the realm's phone / security image / SMS flow. A per-client flow
# override; applied here because the realm file is imported only once.
auth=(-H "Authorization: Bearer $token")
flow=$(c "${auth[@]}" "$base/admin/realms/suiss/authentication/flows" |
  python3 -c 'import sys,json;print(next(f["id"] for f in json.load(sys.stdin) if f["alias"]=="browser"))')
client=$(c "${auth[@]}" "$base/admin/realms/suiss/clients?clientId=security-admin-console" |
  python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
c -X PUT "${auth[@]}" -H "Content-Type: application/json" \
  -d "{\"authenticationFlowBindingOverrides\":{\"browser\":\"$flow\"}}" "$base/admin/realms/suiss/clients/$client"

port="${KC_PROXY_PORT:-443}"
[ "$port" = 443 ] && port="" || port=":$port"
public="https://${KC_PUBLIC_HOST:-auth.localhost}$port"
echo "master admin:    https://$admin$port/admin/master/console/"
echo "suiss admin:     https://$admin$port/admin/suiss/console/"
echo "suiss account:   $public/realms/suiss/account/"
