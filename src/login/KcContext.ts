/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { ExtendKcContext } from "keycloakify/login";
import type { KcEnvName, ThemeName } from "../kc.gen";

/** A single admin-managed terms document (mirrors the multi-terms SPI Term bean). */
export type Term = {
    key: string;
    title: string;
    version: string;
    required: boolean;
    mustRead: boolean;
    content: string;
};

export type KcContextExtension = {
    themeName: ThemeName;
    properties: Record<KcEnvName, string> & {};
};

// Custom / extended pages. A key ending in ".ftl" that is NOT a standard Keycloak
// page makes Keycloakify emit an FTL for it (a custom page). The fields below are
// whatever our Java SPI passes via form.setAttribute(...): Keycloakify serializes
// the whole FreeMarker data model into kcContext, so they are typed and available
// in React without writing any FTL by hand.
export type KcContextExtensionPerPage = {
    // Standard page, extended with the terms our registration FormAction adds.
    "register.ftl": {
        terms?: Term[];
        // Set by the RegisterMode FormAction from the realm attribute
        // "kycRegisterMode": "a1" (anonim — telefon) | "l1" (TCKN). Drives which
        // fields the register screen shows. Defaults to "l1".
        kycRegisterMode?: "a1" | "l1";
        // Keycloak also exposes the social IdP list on the register page, but
        // keycloakify's stock register.ftl typing does not include it.
        social?: {
            displayInfo?: boolean;
            providers?: {
                alias: string;
                providerId?: string;
                displayName: string;
                loginUrl: string;
                iconClasses?: string;
            }[];
        };
    };
    // Custom page: login-time terms re-consent (RequiredAction "terms-reconsent").
    "terms-reconsent.ftl": {
        terms: Term[];
    };
    // Custom page: resumable registration completion (RequiredAction
    // "complete-registration"). One screen per step, driven by the server.
    "complete-registration.ftl": {
        step:
            | "IDENTITY"
            | "PHONE"
            | "PHONE_OTP"
            | "EMAIL"
            | "EMAIL_OTP"
            | "PASSWORD";
        firstName: string;
        lastName: string;
        tc: string;
        birthDate: string;
        phoneNumber: string;
        userEmail: string;
        // Filled only at IDENTITY: the terms still to accept (extensions/README.md).
        terms?: Term[];
    };
    // Custom page: anti-phishing security image, after username/password
    // (Authenticator "security-image"). The catalog is an admin-managed list of
    // image URLs (authenticator config). SELECT lets the user pick one from
    // `images` (URLs); CONFIRM shows `selectedImage` (URL) to confirm it is theirs.
    "security-image.ftl": {
        mode: "SELECT" | "CONFIRM";
        images?: string[];
        selectedImage?: string;
    };
    // Custom page: phone OTP step, after the security image
    // (Authenticator "phone-otp"). `phoneNumber` is already masked by the server.
    "phone-otp.ftl": {
        phoneNumber: string;
    };
};

export type KcContext = ExtendKcContext<KcContextExtension, KcContextExtensionPerPage>;
