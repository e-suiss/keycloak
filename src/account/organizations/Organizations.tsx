/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/organizations/Organizations.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type OrganizationRepresentation from "@keycloak/keycloak-admin-client/lib/defs/organizationRepresentation";
import { BuildingsIcon } from "@phosphor-icons/react";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import { Spinner } from "@ui/components/spinner";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import type { AccountEnvironment } from "..";
import { getUserOrganizations } from "../api/methods";
import { Page } from "../components/page/Page";
import { usePromise } from "../utils/usePromise";

export const Organizations = () => {
    const { t } = useTranslation();
    const context = useEnvironment<AccountEnvironment>();

    const [userOrgs, setUserOrgs] = useState<OrganizationRepresentation[]>([]);

    usePromise(signal => getUserOrganizations({ signal, context }), setUserOrgs);

    if (!userOrgs) {
        return (
            <div className="grid place-items-center py-24">
                <Spinner />
            </div>
        );
    }

    return (
        <Page title={t("organizations")} description={t("organizationDescription")}>
            <div className="space-y-7">
                {userOrgs.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <BuildingsIcon />
                            </EmptyMedia>
                            <EmptyTitle>{t("emptyUserOrganizations")}</EmptyTitle>
                            <EmptyDescription>
                                {t("emptyUserOrganizationsInstructions")}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <section>
                        <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                            {t("organizations")}
                        </h3>
                        <ItemGroup variant="inset">
                            {userOrgs.map((org, index) => {
                                const subtitle =
                                    org.description ||
                                    org.domains?.map(d => d.name).join(", ");
                                return (
                                    <Fragment key={org.id}>
                                        {index > 0 && <ItemSeparator />}
                                        <Item size="sm">
                                            <ItemMedia variant="icon">
                                                <BuildingsIcon />
                                            </ItemMedia>
                                            <ItemContent>
                                                <ItemTitle>{org.name}</ItemTitle>
                                                {subtitle && (
                                                    <ItemDescription>{subtitle}</ItemDescription>
                                                )}
                                            </ItemContent>
                                        </Item>
                                    </Fragment>
                                );
                            })}
                        </ItemGroup>
                    </section>
                )}
            </div>
        </Page>
    );
};

export default Organizations;
