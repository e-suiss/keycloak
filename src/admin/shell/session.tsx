// @ts-nocheck
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import { useAdminClient } from "../admin-client";
import { environment } from "../environment";
import { useRealm } from "../ui/realm";

export const REALMS_CHANGED_EVENT = "sx-realms-changed";

export function notifyRealmsChanged() {
    window.dispatchEvent(new Event(REALMS_CHANGED_EVENT));
}

export function useRealmsVersion() {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        const bump = () => setVersion(n => n + 1);
        window.addEventListener(REALMS_CHANGED_EVENT, bump);
        return () => window.removeEventListener(REALMS_CHANGED_EVENT, bump);
    }, []);
    return version;
}

type WhoAmICtx = {
    whoAmI: any | null;
    ready: boolean;
    hasAccess: (...roles: string[]) => boolean;
};

const Ctx = createContext<WhoAmICtx>({ whoAmI: null, ready: false, hasAccess: () => false });

export const useWhoAmI = () => useContext(Ctx);

export function WhoAmIProvider({ children }: PropsWithChildren) {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const version = useRealmsVersion();
    const [whoAmI, setWhoAmI] = useState<any | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let alive = true;
        adminClient.whoAmI
            .find({ realm: environment.realm, currentRealm: realm })
            .then(result => {
                if (!alive) return;
                setWhoAmI(result ?? null);
                setReady(true);
            })
            .catch(() => {
                if (!alive) return;
                setWhoAmI(null);
                setReady(true);
            });
        return () => {
            alive = false;
        };
    }, [adminClient, realm, version]);

    const access: string[] = whoAmI?.realm_access?.[realm] ?? [];
    const hasAccess = (...roles: string[]) => roles.every(role => access.includes(role));

    return <Ctx.Provider value={{ whoAmI, ready, hasAccess }}>{children}</Ctx.Provider>;
}
