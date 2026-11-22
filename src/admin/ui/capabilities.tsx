// @ts-nocheck
// Shared realm capability detection: server feature flags + realm-level toggles.
// Used to conditionally show/hide nav items and gate feature-specific screens,
// mirroring the official Keycloak admin console behaviour.
import { useEffect, useState } from "react";
import { useAdminClient } from "../admin-client";
import { useRealm } from "./realm";

export function useCapabilities() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const [state, setState] = useState<any>({
        ready: false,
        features: {},
        realmRep: null
    });

    useEffect(() => {
        let alive = true;
        (async () => {
            const [info, rep] = await Promise.all([
                adminClient.serverInfo.find().catch(() => null),
                adminClient.realms.findOne({ realm }).catch(() => null)
            ]);
            if (!alive) return;
            const features: Record<string, boolean> = {};
            (info?.features || []).forEach((f: any) => {
                if (f?.name) features[f.name] = !!f.enabled;
            });
            setState({ ready: true, features, realmRep: rep });
        })();
        return () => {
            alive = false;
        };
    }, [adminClient, realm]);

    return {
        ready: state.ready,
        realmRep: state.realmRep,
        isFeatureEnabled: (name: string) => !!state.features[name],
        // Convenience flags matching the console's nav gating.
        organizationsEnabled: !!state.realmRep?.organizationsEnabled,
        adminPermissionsEnabled:
            !!state.features.ADMIN_FINE_GRAINED_AUTHZ_V2 &&
            !!state.realmRep?.adminPermissionsEnabled,
        workflowsEnabled: !!state.features.WORKFLOWS
    };
}
