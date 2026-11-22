import type { KcContext } from "./KcContext";

/**
 * Admin consoles sign in with a plain username and password (Keycloak's built-in "browser" flow):
 * the whole master realm, and each realm's own admin console client. Everyone else uses a phone number.
 */
export function isAdminLogin(kcContext: Pick<KcContext, "realm" | "client">): boolean {
    return kcContext.realm.name === "master" || kcContext.client.clientId === "security-admin-console";
}
