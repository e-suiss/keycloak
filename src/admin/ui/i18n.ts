// @ts-nocheck
import { useTranslation } from "react-i18next";
import { DEFAULT_LOCALE } from "../i18n/constants";
import { i18n } from "../i18n/i18n";

const RTL_LOCALES = ["ar", "dv", "fa", "ha", "he", "iw", "ji", "ps", "sd", "ug", "ur", "vi", "yi"];

export async function initAdminI18n(adminClient: any, environment: any) {
    const realm = decodeURIComponent(window.location.hash.split("/")[1] || "") || environment.realm;
    const who = await adminClient.whoAmI
        .find({ realm: environment.realm, currentRealm: realm })
        .catch(() => null);
    const locale = who?.locale || DEFAULT_LOCALE;
    if (!i18n.isInitialized) await i18n.init({ lng: locale });
    else await i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

export function useT() {
    return useTranslation().t;
}
