// @ts-nocheck
// Shared admin helpers: date formatting + raw admin-REST / admin-UI-ext fetch.

export const fmtDate = (v: any) =>
    v
        ? new Date(typeof v === "number" ? v : Number(v) || v).toLocaleString("tr-TR")
        : "—";

export const fmtDateShort = (v: any) =>
    v
        ? new Date(typeof v === "number" ? v : Number(v) || v).toLocaleDateString(
              "tr-TR",
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
    const diff = Date.now() - t;
    const sec = Math.round(diff / 1000);
    if (sec < 60) return "az önce";
    const min = Math.round(sec / 60);
    if (min < 60) return `${min} dk önce`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} sa önce`;
    const day = Math.round(hr / 24);
    if (day < 30) return `${day} gün önce`;
    return new Date(t).toLocaleDateString("tr-TR");
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
