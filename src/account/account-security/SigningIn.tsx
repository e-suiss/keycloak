/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/account-security/SigningIn.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import {
    DeviceMobileIcon,
    FingerprintIcon,
    InfoIcon,
    LockIcon,
    PlusIcon,
    WarningIcon
} from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemGroup,
    ItemMedia,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import { Spinner } from "@ui/components/spinner";
import { Fragment, type ReactNode, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import type { AccountEnvironment } from "..";
import { getCredentials } from "../api/methods";
import type {
    CredentialContainer,
    CredentialMetadataRepresentation
} from "../api/representations";
import { Page } from "../components/page/Page";
import type { TFuncKey } from "../i18n-type";
import { formatDate } from "../utils/formatDate";
import { usePromise } from "../utils/usePromise";

// Icon per credential category.
function containerVisual(type: string): { icon: ReactNode } {
    const t = (type || "").toLowerCase();
    if (t.includes("password")) {
        return { icon: <LockIcon /> };
    }
    if (t.includes("otp") || t.includes("totp")) {
        return { icon: <DeviceMobileIcon /> };
    }
    if (t.includes("webauthn") || t.includes("passwordless") || t.includes("passkey")) {
        return { icon: <FingerprintIcon /> };
    }
    return { icon: <LockIcon /> };
}

export const SigningIn = () => {
    const { t } = useTranslation();
    const context = useEnvironment<AccountEnvironment>();
    const { login } = context.keycloak;

    const [credentials, setCredentials] = useState<CredentialContainer[]>();

    usePromise(signal => getCredentials({ signal, context }), setCredentials, []);

    const credentialRowDesc = (credMetadata: CredentialMetadataRepresentation) => {
        const credential = credMetadata.credential;
        const parts: ReactNode[] = [];

        if (credential.createdDate) {
            parts.push(
                <span
                    key={`created${credential.id}`}
                    data-testrole="created-at"
                    className="tabular-nums"
                >
                    <Trans
                        i18nKey="credentialCreatedAt"
                        values={{
                            date: formatDate(
                                new Date(credential.createdDate),
                                context.environment.locale
                            )
                        }}
                    >
                        <strong className="font-medium text-foreground"></strong>
                    </Trans>
                </span>
            );
        }

        if (
            credMetadata.infoMessage ||
            credMetadata.infoProperties ||
            (credMetadata.warningMessageTitle && credMetadata.warningMessageDescription)
        ) {
            parts.push(
                <div
                    key={`warning-message${credential.id}`}
                    data-testrole="warning-message"
                    className="flex flex-col gap-1"
                >
                    {credMetadata.infoMessage && (
                        <span className="flex items-center gap-1.5">
                            <InfoIcon />
                            {t(
                                credMetadata.infoMessage.key,
                                credMetadata.infoMessage.parameters?.reduce(
                                    (acc, val, idx) => ({ ...acc, [idx]: val }),
                                    {}
                                )
                            )}
                        </span>
                    )}
                    {credMetadata.infoProperties && (
                        <span className="flex flex-col gap-0.5">
                            {credMetadata.infoProperties.map(prop => (
                                <span key={prop.key} className="flex gap-1.5">
                                    <span className="font-medium text-foreground">
                                        {t(prop.key)}
                                    </span>
                                    <span>
                                        {prop.parameters ? prop.parameters[0] : ""}
                                    </span>
                                </span>
                            ))}
                        </span>
                    )}
                    {credMetadata.warningMessageTitle &&
                        credMetadata.warningMessageDescription && (
                            <Alert>
                                <WarningIcon />
                                <AlertTitle>
                                    {t(
                                        credMetadata.warningMessageTitle.key,
                                        credMetadata.warningMessageTitle.parameters?.reduce(
                                            (acc, val, idx) => ({ ...acc, [idx]: val }),
                                            {}
                                        )
                                    )}
                                </AlertTitle>
                                <AlertDescription>
                                    {t(
                                        credMetadata.warningMessageDescription.key,
                                        credMetadata.warningMessageDescription.parameters?.reduce(
                                            (acc, val, idx) => ({ ...acc, [idx]: val }),
                                            {}
                                        )
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}
                </div>
            );
        }

        if (parts.length === 0) return undefined;
        return (
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">{parts}</div>
        );
    };

    if (!credentials) {
        return (
            <div className="flex justify-center py-24">
                <Spinner className="size-6 text-muted-foreground" />
            </div>
        );
    }

    const credentialUniqueCategories = [...new Set(credentials.map(c => c.category))];

    return (
        <Page title={t("signingIn")} description={t("signingInDescription")}>
            <div className="space-y-7">
                {credentialUniqueCategories.map(category => (
                    <Fragment key={category}>
                        {credentials
                            .filter(cred => cred.category === category)
                            .map(container => {
                                const v = containerVisual(container.type);
                                const creds = container.userCredentialMetadatas;
                                const rows: ReactNode[] = [];
                                if (creds.length === 0 && !container.createAction) {
                                    rows.push(
                                        <Item
                                            key="not-set-up"
                                            size="sm"
                                            role="listitem"
                                            data-testid={`${container.type}/not-set-up`}
                                        >
                                            <ItemMedia variant="icon">{v.icon}</ItemMedia>
                                            <ItemContent>
                                                <ItemTitle className="font-normal">
                                                    {t("notSetUp", {
                                                        name: t(
                                                            container.displayName as TFuncKey
                                                        )
                                                    })}
                                                </ItemTitle>
                                            </ItemContent>
                                        </Item>
                                    );
                                }
                                creds.forEach(meta => {
                                    rows.push(
                                        <Item
                                            key={meta.credential.id}
                                            size="sm"
                                            role="listitem"
                                        >
                                            <ItemMedia variant="icon">{v.icon}</ItemMedia>
                                            <ItemContent className="min-w-0">
                                                <ItemTitle
                                                    id={`cred-${meta.credential.id}`}
                                                    data-testrole="label"
                                                >
                                                    {t(meta.credential.userLabel) ||
                                                        t(meta.credential.type as TFuncKey)}
                                                </ItemTitle>
                                                {credentialRowDesc(meta)}
                                            </ItemContent>
                                            <ItemActions
                                                id={`action-${meta.credential.id}`}
                                                aria-label={t("updateCredAriaLabel")}
                                                aria-labelledby={`cred-${meta.credential.id}`}
                                            >
                                                {container.updateAction && (
                                                    <Button
                                                        variant="tinted"
                                                        size="sm"
                                                        data-testrole="update"
                                                        onClick={() =>
                                                            login({
                                                                action: container.updateAction
                                                            })
                                                        }
                                                    >
                                                        {t("update")}
                                                    </Button>
                                                )}
                                                {container.removeable && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        data-testrole="remove"
                                                        onClick={() =>
                                                            login({
                                                                action:
                                                                    "delete_credential:" +
                                                                    meta.credential.id
                                                            })
                                                        }
                                                    >
                                                        {t("delete")}
                                                    </Button>
                                                )}
                                            </ItemActions>
                                        </Item>
                                    );
                                });
                                if (container.createAction) {
                                    rows.push(
                                        <Item key="create" size="sm" role="listitem" asChild>
                                            <button
                                                type="button"
                                                data-testid={`${container.type}/create`}
                                                onClick={() =>
                                                    login({
                                                        action: container.createAction
                                                    })
                                                }
                                            >
                                                <ItemMedia variant="icon">
                                                    <PlusIcon />
                                                </ItemMedia>
                                                <ItemContent>
                                                    <ItemTitle className="text-primary">
                                                        {t("setUpNew", {
                                                            name: t(
                                                                `${container.type}-display-name` as TFuncKey
                                                            )
                                                        })}
                                                    </ItemTitle>
                                                </ItemContent>
                                            </button>
                                        </Item>
                                    );
                                }
                                return (
                                    <section
                                        key={container.type}
                                        data-testid={`${container.type}/credential-list`}
                                    >
                                        <h3
                                            className="mb-2 ms-1 text-sm font-medium text-muted-foreground"
                                            data-testid={`${container.type}/title`}
                                        >
                                            {t(container.displayName as TFuncKey)}
                                        </h3>
                                        <ItemGroup variant="inset">
                                            {rows.map((row, i) => (
                                                <Fragment key={i}>
                                                    {i > 0 && <ItemSeparator />}
                                                    {row}
                                                </Fragment>
                                            ))}
                                        </ItemGroup>
                                        <p
                                            className="mt-2 ms-1 text-sm text-muted-foreground"
                                            data-testid={`${container.type}/help-text`}
                                        >
                                            {t(container.helptext as TFuncKey)}
                                        </p>
                                    </section>
                                );
                            })}
                    </Fragment>
                ))}
            </div>
        </Page>
    );
};

export default SigningIn;
