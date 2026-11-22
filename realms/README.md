# Realm tanımları

``--import-realm`` ile Keycloak açılışta bu dizindeki her `*-realm.json` dosyasını içeri alır. Yerel veri kalıcı olmadığı için (bkz. `infra/PORTS.md`) realm **her başlangıçta buradan yeniden kurulur** — Admin UI'da elle yapılan değişiklik bir sonraki restart'ta kaybolur. Bu bilinçlidir: realm'in içe aktarmadan yeniden kurulabildiği her seferinde sınanır (backend.md Böl. 19).

## `suiss`

Test ve geliştirme realm'i. `master` yalnız yönetim içindir, akışlar orada denenmez.

| Konu | Değer |
|---|---|
| Tema | `suiss` (login, account, email) — Keycloakify, `src/` (bu proje) |
| Kayıt | Açık |
| PIN sıfırlama | Açık, telefon OTP üzerinden |
| Organizations | Açık (backend.md Böl. 32.1) |
| Şifre politikası | `length(6)`, `^[0-9]{6}$`, `passwordHistory(3)`, `pinStrength` (Böl. 7) |
| Brute force | Kademeli: 6 hatada kilit, artan bekleme, kalıcı kilit yok (Böl. 7) |
| Varsayılan admin | `admin` / `482916`, yalnız bu realm'in `realm-admin`'i; `/admin/suiss/console/` kullanıcı adı + şifreyle girer. Yerel geliştirme içindir, prod realm dosyasına konmaz |
| Access token | 5 dk (Böl. 7 "kısa access token") |

### Akışlar

```
suiss browser
├─ Cookie                          ALTERNATIVE
└─ suiss forms                     ALTERNATIVE
   ├─ phone-username-form          REQUIRED
   ├─ phone-password-form          REQUIRED
   ├─ security-image               REQUIRED
   └─ phone-otp                    REQUIRED

suiss registration
└─ suiss registration form         REQUIRED
   └─ register-or-resume           REQUIRED

suiss reset credentials
├─ reset-phone-choose-user         REQUIRED
├─ reset-phone-otp                 REQUIRED
└─ reset-password                  REQUIRED
```

Kayıt formu yalnız telefon alır ve kullanıcıyı oluşturur; kalan adımlar (telefon OTP, kimlik bilgileri + sözleşmeler, e-posta, e-posta OTP, PIN) `complete-registration` required action'ı üzerinden yürür.

### Kullanıcı profili

| Alan | Doğrulayıcı |
|---|---|
| `tc` | `tc-kimlik` (TCKN algoritması) |
| `birthDate` | `min-age` (18) |
| `phoneNumber` | `^5[0-9]{9}$` |
| `phoneNumberVerified`, `securityImage` | — (kod tarafından yazılır) |

### Client

`esuiss-web` — public, PKCE `S256` zorunlu. `channel=WEB` ve `user_type=INDIVIDUAL` claim'leri protocol mapper ile token'a girer (Böl. 5). `phone_number` claim'i `phoneNumber` attribute'undan gelir.

Yönlendirme adresleri yereldir (`5173`, `3000`, `9999`); prod client'ları ayrı realm dosyasında tanımlanır.

## Deneme

```sh
make docker-up
open http://localhost:8601/realms/suiss/account
```

Yönetim: `http://localhost:8601` → `master` realm, `admin` / `admin`.

> **Sır yok.** Realm dosyasında client secret bulunmaz; `esuiss-web` public client'tır. Gizli client eklenirse sırrı `${VAR}` yer tutucusuyla dışarı alınır — repoda düz metin sır durmaz (backend.md Böl. 19).
