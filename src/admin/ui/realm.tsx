// @ts-nocheck
// Lightweight realm context — replaces Keycloak's PatternFly RealmContext.
// Reads the realm from the (hash) route and points the admin client at it.
import { createContext, type PropsWithChildren, useContext } from "react";
import { useLocation } from "react-router-dom";
import { useAdminClient } from "../admin-client";
import { environment } from "../environment";

type RealmCtx = { realm: string };
const Ctx = createContext<RealmCtx>({ realm: environment.realm });

export const useRealm = () => useContext(Ctx);

export function RealmProvider({ children }: PropsWithChildren) {
    const { adminClient } = useAdminClient();
    const { pathname } = useLocation();
    const realm = decodeURIComponent(pathname.split("/")[1] || "") || environment.realm;

    if (adminClient.realmName !== realm) adminClient.setConfig({ realmName: realm });

    return <Ctx.Provider value={{ realm }}>{children}</Ctx.Provider>;
}
