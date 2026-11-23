// @ts-nocheck
import { i18n } from "../i18n/i18n";
// Shared admin helpers: date formatting + raw admin-REST / admin-UI-ext fetch.

function lang() {
    return i18n.language || "en";
}

export const fmtDate = (v: any) =>
    v
        ? new Date(typeof v === "number" ? v : Number(v) || v).toLocaleString(lang())
        : "—";

export const fmtDateShort = (v: any) =>
    v
        ? new Date(typeof v === "number" ? v : Number(v) || v).toLocaleDateString(
              lang(),
              {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
              }
          )
        : "—";

/** Relative time ("3 dk önce") with absolute fallback. */
export function fmtRelative(v: any) {
    if (!v) return "—";
    const t = new Date(typeof v === "number" ? v : Number(v) || v).getTime();
    const sec = Math.round((t - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(lang(), { numeric: "auto" });
    const abs = Math.abs(sec);
    if (abs < 60) return rtf.format(sec, "second");
    if (abs < 3600) return rtf.format(Math.round(sec / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(sec / 3600), "hour");
    if (abs < 2592000) return rtf.format(Math.round(sec / 86400), "day");
    return new Date(t).toLocaleDateString(lang());
}

/**
 * Call a raw Keycloak admin endpoint (incl. the admin-UI extension `ui-ext/*`
 * routes the official console relies on). Returns parsed JSON, or [] on 404.
 */
export async function adminFetch(
    adminClient: any,
    realm: string,
    endpoint: string,
    params?: Record<string, any>
) {
    const token = await adminClient.getAccessToken();
    const qs = params
        ? "?" +
          Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== null && v !== "")
              .map(
                  ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
              )
              .join("&")
        : "";
    const url = `${adminClient.baseUrl}/admin/realms/${encodeURIComponent(realm)}/${endpoint}${qs}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`${endpoint} → ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

/** Initials for a monogram avatar. */
export function initials(name: string) {
    if (!name) return "?";
    const parts = String(name)
        .trim()
        .split(/[\s._-]+/)
        .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function registrationFlowAlias(adminClient: any, realm: string) {
    const rep = await adminClient.realms.findOne({ realm }).catch(() => null);
    return rep?.registrationFlow || "registration";
}
