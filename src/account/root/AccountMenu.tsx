// @ts-nocheck
// Account-style avatar menu — uses the shared NavUser (same in every app).
import { NavUser } from "../../shared/NavUser";

import { useEnvironment } from "../../shared/keycloak-ui-shared";
import type { AccountEnvironment } from "..";
import { useTheme } from "../theme";

export function AccountMenu() {
    const { environment, keycloak } = useEnvironment<AccountEnvironment>();
    const { mode, setMode, allowDark } = useTheme();

    const user = keycloak?.idTokenParsed as
        | { name?: string; preferred_username?: string; email?: string }
        | undefined;
    const name = user?.name || user?.preferred_username || user?.email || "—";
    const email = user?.email || "";
    const referrer = environment.referrerUrl?.replace("_hash_", "#");

    return (
        <NavUser
            name={name}
            email={email}
            mode={allowDark ? mode : undefined}
            onModeChange={allowDark ? setMode : undefined}
            onSignOut={() => keycloak.logout({ redirectUri: referrer })}
        />
    );
}
