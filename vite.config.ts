import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { keycloakify } from "keycloakify/vite-plugin";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: { "@ui": fileURLToPath(new URL("./src/ui", import.meta.url)) }
    },
    plugins: [
        react(),
        tailwindcss(),
        keycloakify({
            themeName: "suiss",
            accountThemeImplementation: "Single-Page",
            // Keycloak sunucusunun ortamından okunur (kcContext.properties.ESUISS_ENV).
            // "dev" / "test" login ekranlarının sol üstünde ortam rozeti gösterir; "prod" göstermez.
            environmentVariables: [{ name: "ESUISS_ENV", default: "prod" }],
            startKeycloakOptions: {
                // Dev Keycloak'ı varsayılan "myrealm" yerine gerçek "suiss" realm'i
                // ile başlat. Böylece custom akışlar (secure-browser login, phone-OTP,
                // telefon ile şifre sıfırlama = reset-phone, registration) dev'de de
                // birebir geçerli olur. myrealm stock "reset credentials" (e-posta)
                // akışını kullandığı için forgot-password telefon adımını atlayıp
                // login'e geri atıyordu.
                realmJsonFilePath: "./realms/suiss-realm.json",
                // Preview özellikleri start-keycloak'ta aç:
                //  - admin-fine-grained-authz:v2 → yeni "Admin Permissions"
                //  - workflows → kullanıcı yaşam döngüsü otomasyonu
                //  - organization → multi-tenant (organizasyonlar)
                keycloakExtraArgs: [
                    "--features=admin-fine-grained-authz:v2,workflows,organization,dpop,oid4vc-vci"
                ],
                // Tüm sunucu SPI'larını dev Keycloak'a yükle (production'daki
                // docker-compose ile aynı eklentiler). Böylece myrealm'de de
                // register-mode (A1/L1), çoklu terms, security-image + phone OTP,
                // authz PDP gibi custom provider'lar admin konsolda görünür.
                extensionJars: [
                    "./extensions/registration/target/keycloak-registration-1.0.0.jar",
                    "./extensions/multi-terms/target/keycloak-multi-terms-1.0.0.jar",
                    "./extensions/login/target/keycloak-login-1.0.0.jar",
                    "./extensions/authz/target/keycloak-authz-1.0.0.jar"
                ]
            }
        })
    ]
});
