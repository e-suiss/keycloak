# esuiss-keycloak

Suiss'in Keycloak tabanlı kimlik katmanı, tek proje olarak: realm ayarı, Java SPI uzantıları ve
Keycloakify teması (login, account, admin).

Kaynaklar: `e-suiss/esuiss` → `infra/keycloak` (realm, SPI, compose) ve `ademceper/target-ui` →
`apps/auth` (tema). Temanın kullandığı `@target/ui` bileşenleri `src/ui/` altına alındı ve `@ui/…`
olarak içe aktarılır.

## Yapı

```
Containerfile        optimize imaj: SPI + tema jar'ları, kc.sh build, start --optimized
docker-compose.yml   proxy (Caddy) + Keycloak + PostgreSQL; dışarıya yalnız proxy açık
deploy/Caddyfile     hangi yolun hangi alan adında açık olduğu
deploy/certs.sh      yerel CA ve TLS sertifikaları (deploy/tls, git'e girmez)
realms/              suiss realm'i (bir kez içe aktarılır)
extensions/          Java SPI: login, registration, multi-terms, authz, common
src/                 Keycloakify teması: login/, account/, admin/, ui/ (bileşenler)
```

## Production düzeni

Keycloak'ın production rehberlerine göre (configuration-production, reverseproxy, hostname,
management-interface, containers):

| Konu | Uygulama |
|---|---|
| Çalıştırma | `start-dev` yok; imaj `kc.sh build` ile derlenir, `start --optimized` ile açılır |
| TLS | re-encrypt: proxy TLS'i sonlandırır, Keycloak'a TLS ile bağlanır |
| Hostname | kullanıcılar `auth.localhost`, yönetim konsolu `admin.auth.localhost` (`hostname-admin`) |
| Açık yollar | kullanıcı alan adında yalnız `/realms/` (master hariç), `/resources/`, `/.well-known/` |
| Yönetim | `/admin/` ve `/realms/master/` yalnız yönetim alan adında; production'da yalnız iç ağ ya da VPN |
| Master realm | frontend URL'si yönetim alan adı (`deploy/master-frontend.sh`, `make up` çalıştırır); konsolun girişi ve iframe kontrolü orada kalır |
| Health, metrics | 9000 portunda; proxy'lenmez, dışarıya açılmaz |
| Proxy başlıkları | `proxy-headers=xforwarded`, yalnız proxy'nin ağı güvenilir |
| Realm içe aktarma | açılışta değil, bir kez `make import` ile |
| Gizli bilgiler | `.env` (git'e girmez); `make env` rastgele şifre üretir |
| Kaynak | bellek 2 GB, `http-max-queued-requests=1000` |

## Komutlar

```sh
pnpm install
make image      # SPI + tema jar'ları ve optimize imaj
make import     # ilk kurulumda bir kez: realm ve ilk yönetici
make up         # https://auth.localhost ve https://admin.auth.localhost (443)
make logs
make down
pnpm dev        # yalnız tema geliştirme: keycloakify'ın geliştirme Keycloak'ı
```

İlk yönetici `.env`'deki `KC_BOOTSTRAP_ADMIN_*` ile oluşur; Keycloak bunu geçici sayar. Konsoldan
kalıcı bir yönetici açılıp geçici olan silinmelidir.

Tarayıcı `deploy/tls/ca.crt`'ye güvenmezse sertifika uyarısı verir. Güvenmek için:
`sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain deploy/tls/ca.crt`

## Özel ekranlar

`extensions/`'ın beklediği şablonlar temada `src/login/pages/` altında:

| Şablon | Ekran |
|---|---|
| `security-image.ftl` | `SecurityImage.tsx` |
| `phone-otp.ftl` | `PhoneOtp.tsx` |
| `complete-registration.ftl` | `CompleteRegistration.tsx` |
| `terms-reconsent.ftl` | `TermsReconsent.tsx` |

Sözleşme (dosya adları ve alanlar): `extensions/README.md`.
