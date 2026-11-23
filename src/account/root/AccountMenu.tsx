// @ts-nocheck
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { UserMenu } from "../../shared/shell/UserMenu";
import type { AccountEnvironment } from "..";

export function AccountMenu() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { environment, keycloak } = useEnvironment<AccountEnvironment>();

    const user = keycloak?.idTokenParsed as
        | { name?: string; preferred_username?: string; email?: string }
        | undefined;
    const name = user?.name || user?.preferred_username || user?.email || "—";
    const referrer = environment.referrerUrl?.replace("_hash_", "#") || undefined;

    return (
        <UserMenu
            name={name}
            email={user?.email}
            items={[
                {
                    label: t("personalInfo"),
                    onSelect: () => navigate(new URL(environment.baseUrl).pathname + location.search)
                }
            ]}
            signOutLabel={t("signOut")}
            onSignOut={() => keycloak.logout({ redirectUri: referrer })}
        />
    );
}
