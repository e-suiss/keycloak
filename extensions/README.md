# Keycloak SPI uzantıları

Login akışının kuralları Java SPI olarak burada yaşar; tema yalnızca render eder (backend.md Böl. 1, 7).

## Yapı standardı

```
extensions/
├─ pom.xml                    com.esuiss.keycloak — Keycloak sürümünün tek kaynağı
├─ login/                     giriş akışı authenticator'ları
├─ registration/              kademeli kayıt, doğrulayıcılar, şifre politikası
├─ multi-terms/               sürümlü sözleşme onayı
└─ authz/                     realm REST uzantısı
```

Kurallar:

| Konu | Kural |
|---|---|
| Paket kökü | `com.esuiss.keycloak.<modül>[.<alan>]`. Tek ters-alan kökü; modül başına ayrı namespace açılmaz |
| Keycloak sürümü | Yalnız üst POM'daki `<keycloak.version>`. Çocuk POM'lar sürüm yazmaz — `keycloak-server-spi-private` minor sürümler arası kararsızdır ve sapma çalışma anında `NoSuchMethodError` olarak patlar |
| SPI kaydı | `src/main/resources/META-INF/services/<SPI arayüzü>` |
| Jar adı | Sürümlü (`keycloak-login-1.0.0.jar`). `<finalName>` ile sürüm silinmez — backend.md Böl. 19 jar'ların versiyonlu olmasını şart koşar |
| Yorum | Kod içinde yorum satırı yok; gerekçe `backend.md`'de yaşar |
| Test | Saf mantık (`Phone`, `PinRules`, `TcKimlikValidator`, `MinAgeValidator`, `OtpCodes`) birim testli. Keycloak bağımlılığı olan sınıflar Mockito ile izole edilir |
| Yapı ortamı | Enforcer JDK'yı `[21,22)` aralığına kilitler ve bağımlılık yakınsamasını zorunlu kılar; yanlış JDK'da derleme sessizce geçmez |
| Maven | Sistem Maven'ı kullanılır; üst POM'daki enforcer `[3.9,)` altındaki sürümde derlemeyi durdurur |

## Sağlayıcı kimlikleri

Bunlar realm JSON'unun referans verdiği **sözleşmedir**; sınıf ve paket adı değişebilir, bu kimlikler değişemez.

| Kimlik | Tür | Modül |
|---|---|---|
| `phone-username-form` | Authenticator | login |
| `phone-password-form` | Authenticator | login |
| `phone-otp` | Authenticator | login |
| `reset-phone-choose-user` | Authenticator | login |
| `reset-phone-otp` | Authenticator | login |
| `security-image` | Authenticator | login |
| `register-or-resume` | FormAction | registration |
| `registration-verification` | FormAction | registration |
| `complete-registration` | RequiredAction | registration |
| `pinStrength` | PasswordPolicy | registration |
| `term-registration` | FormAction | multi-terms |
| `terms-reconsent` | RequiredAction | multi-terms |

## Şablon sözleşmesi (backend ↔ Keycloakify)

Şablonlar Java tarafında **durmaz**; bu projenin Keycloakify temasından (`src/login`) gelir. Ama dosya adları iki taraf arasında bağlayıcı bir sözleşmedir: Java'daki `createForm(...)` çağrısı ile temanın ürettiği dosya adı birebir tutmak zorundadır. Tutmazsa akış çalışma anında "şablon bulunamadı" ile kırılır.

| Şablon | Çağıran |
|---|---|
| `security-image.ftl` | `security-image` authenticator |
| `phone-otp.ftl` | `phone-otp` authenticator |
| `login-reset-password.ftl` | `reset-phone-choose-user` authenticator |
| `complete-registration.ftl` | `complete-registration` required action |
| `terms-reconsent.ftl` | `terms-reconsent` required action |

Bir authenticator yeni şablon istediğinde bu tablo ve Keycloakify tarafı **aynı değişiklikte** güncellenir.

Şablonun beklediği alanlar da sözleşmenin parçasıdır. Java tarafında `form().setAttribute(...)` ile gönderilen her ad, Keycloakify'daki `KcContextExtensionPerPage` bildiriminde birebir aynı olmak zorundadır.

| Şablon | Alanlar |
|---|---|
| `security-image.ftl` | `mode`, `images`, `selectedImage` |
| `phone-otp.ftl` | `phoneNumber` |
| `register.ftl` | yalnız `phoneNumber`; hata `phoneNumber` alanına `invalidPhone` olarak düşer |
| `complete-registration.ftl` | `step`, `firstName`, `lastName`, `tc`, `birthDate`, `phoneNumber`, `userEmail`, `terms[]` (yalnız `IDENTITY` adımında dolu) |
| `terms-reconsent.ftl` | `terms[]` — her biri `key`, `title`, `version`, `required`, `mustRead`, `content` |

`complete-registration` adım sırası `CompleteRegistrationAction.nextStep` ile belirlenir ve şablon `step` değerine göre çizer: `PHONE` → `PHONE_OTP` → `IDENTITY` (ad, soyad, doğum tarihi, TCKN ve bekleyen sözleşmeler tek ekranda) → `EMAIL` → `EMAIL_OTP` → `PASSWORD`. Kayıt akışının ilk sayfası yalnız telefon toplar; kullanıcı adı telefon numarasıdır ve yarım kalan kayıt telefonla sürdürülür.

Tema jar'ı proje kökünde üretilir ve `make keycloak-theme` ile `providers/` altına konur. `make keycloak-ext` yalnız kendi `keycloak-*.jar` dosyalarını temizler, tema jar'ına dokunmaz.

## Derleme

```sh
make keycloak-ext      # derle (test dahil), jar'ları providers/ altına koy
make keycloak-test     # yalnız testler
make keycloak-reload   # derle + Keycloak'ı yeniden başlat
```

JDK 21 ve Maven 3.9+ gerekir. Makefile `JAVA_HOME`'u açıkça verir, kabuk yapılandırmandan bağımsız çalışır.

## Test kapsamı

`mvn package` testleri koşar, yani kırık test jar üretmez.

| Sınıf | Neyi güvenceye alıyor | Belge |
|---|---|---|
| `TcKimlikValidator` | TCKN checksum algoritması. Üretilmiş geçerli numaraların **her hanesi tek tek bozulup** reddedildiği doğrulanır | Böl. 7 |
| `MinAgeValidator` | 18 yaş sınırı; doğum gününden bir gün önce/sonra ve 29 Şubat kenar durumu | Böl. 7 |
| `PinRules` | Ardışık, tekrarlı, doğum tarihi / TCKN / telefon türevi PIN reddi | Böl. 7 |
| `OtpCodes` | 3 dakika geçerlilik, 3 yanlışta iptal + yeni kod, iptal edilen kodun tekrar kullanılamaması | Böl. 7 |
| `Phone` | 90/0 önek temizleme, sabit hat reddi, `5XXXXXXXXX` biçimi | — |
| `Terms` | Sözleşme sürümü `contentHash(title+NUL+content)`; sürüm değişince `isPending` yeniden onay ister, `requiredPending` istege bağlıyı dışarıda bırakır, `recordConsent` aynı sürümü tekrar yazmaz, geçmişi ekler, arşivi bir kez yazar | Böl. 7 |
| `PermissionResolver` | İnce yetki kararı: doğrudan + grup zinciri + varsayılan rol, kompozit açılımı (döngü güvenli), yalnız `admin-api` client rolleri | Böl. 7 |

`extensions/` kaynaktır ve versiyonlanır; `*/target/` ile `providers/*.jar` üretilmiş çıktıdır ve git'te durmaz.
