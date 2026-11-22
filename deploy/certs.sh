#!/usr/bin/env bash
# Local TLS for the proxy (auth.localhost, admin.auth.localhost) and for Keycloak behind it
# (re-encrypt). A local CA signs both; trust deploy/tls/ca.crt in the browser, or accept the warning.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p tls && cd tls
[ -s ca.key ] || openssl req -x509 -newkey rsa:3072 -nodes -days 825 -subj "/CN=esuiss-keycloak local CA" -keyout ca.key -out ca.crt
issue() {
  local name="$1" sans="$2"
  [ -s "$name.crt" ] && return
  openssl req -newkey rsa:2048 -nodes -subj "/CN=$name" -keyout "$name.key" -out "$name.csr"
  printf 'subjectAltName=%s\nextendedKeyUsage=serverAuth\n' "$sans" > "$name.ext"
  openssl x509 -req -in "$name.csr" -CA ca.crt -CAkey ca.key -CAcreateserial -days 397 -extfile "$name.ext" -out "$name.crt"
  rm -f "$name.csr" "$name.ext"
}
issue proxy "DNS:${KC_PUBLIC_HOST:-auth.localhost},DNS:${KC_ADMIN_HOST:-admin.auth.localhost}"
issue keycloak "DNS:keycloak"
chmod 644 *.crt *.key
