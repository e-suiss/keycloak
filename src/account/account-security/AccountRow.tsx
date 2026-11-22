/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/account-security/AccountRow.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { useTranslation } from "react-i18next";
import { label, useEnvironment } from "../../shared/keycloak-ui-shared";

import { unLinkAccount } from "../api/methods";
import type { LinkedAccountRepresentation } from "../api/representations";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle
} from "@ui/components/item";
import { useAccountAlerts } from "../utils/useAccountAlerts";

type AccountRowProps = {
    account: LinkedAccountRepresentation;
    isLinked?: boolean;
    refresh: () => void;
};

export const AccountRow = ({ account, isLinked = false, refresh }: AccountRowProps) => {
    const { t } = useTranslation();
    const context = useEnvironment();
    const { login } = context.keycloak;
    const { addAlert, addError } = useAccountAlerts();

    const unLink = async (account: LinkedAccountRepresentation) => {
        try {
            await unLinkAccount(context, account);
            addAlert(t("unLinkSuccess"));
            refresh();
        } catch (error) {
            addError("unLinkError", error);
        }
    };

    return (
        <Item size="sm" role="listitem" data-testid={`linked-accounts/${account.providerName}`}>
            <ItemMedia variant="icon">
                <Avatar size="sm">
                    <AvatarFallback>
                        {(label(t, account.displayName) || account.providerName || "?")
                            .trim()
                            .charAt(0)}
                    </AvatarFallback>
                </Avatar>
            </ItemMedia>
            <ItemContent className="min-w-0">
                <ItemTitle id={`${account.providerAlias}-idp-name`}>
                    {label(t, account.displayName)}
                </ItemTitle>
                <ItemDescription className="flex items-center gap-2">
                    {account.linkedUsername && (
                        <span id={`${account.providerAlias}-idp-username`}>
                            {account.linkedUsername}
                        </span>
                    )}
                    <span id={`${account.providerAlias}-idp-label`}>
                        <Badge variant={account.social ? "default" : "outline"}>
                            {t(account.social ? "socialLogin" : "systemDefined")}
                        </Badge>
                    </span>
                </ItemDescription>
            </ItemContent>
            <ItemActions>
                {isLinked ? (
                    <Button
                        variant="destructive"
                        size="sm"
                        id={`${account.providerAlias}-idp-unlink`}
                        onClick={() => unLink(account)}
                    >
                        {t("unLink")}
                    </Button>
                ) : (
                    <Button
                        variant="tinted"
                        size="sm"
                        id={`${account.providerAlias}-idp-link`}
                        onClick={async () => {
                            await login({
                                action: `idp_link:${account.providerAlias}`
                            });
                        }}
                    >
                        {t("link")}
                    </Button>
                )}
            </ItemActions>
        </Item>
    );
};
