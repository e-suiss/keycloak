/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/applications/Applications.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import {
    AppWindowIcon,
    ArrowSquareOutIcon,
    CaretDownIcon,
    CheckIcon,
    InfoIcon
} from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia
} from "@ui/components/empty";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import { Separator } from "@ui/components/separator";
import { Spinner } from "@ui/components/spinner";
import { cn } from "@ui/lib/utils";
import {
    Confirm,
    ConfirmAction,
    ConfirmCancel,
    ConfirmContent,
    ConfirmDescription,
    ConfirmFooter,
    ConfirmHeader,
    ConfirmTitle,
    ConfirmTrigger
} from "@ui/patterns/confirm";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { label, useEnvironment } from "../../shared/keycloak-ui-shared";

import type { AccountEnvironment } from "..";
import { deleteConsent, getApplications } from "../api/methods";
import type { ClientRepresentation } from "../api/representations";
import { Page } from "../components/page/Page";
import type { TFuncKey } from "../i18n-type";
import { formatDate } from "../utils/formatDate";
import { useAccountAlerts } from "../utils/useAccountAlerts";
import { usePromise } from "../utils/usePromise";

type Application = ClientRepresentation & {
    open: boolean;
};

export const Applications = () => {
    const { t } = useTranslation();
    const context = useEnvironment<AccountEnvironment>();
    const { addAlert, addError } = useAccountAlerts();

    const [applications, setApplications] = useState<Application[]>();
    const [key, setKey] = useState(1);
    const refresh = () => setKey(key + 1);

    usePromise(
        signal => getApplications({ signal, context }),
        clients => setApplications(clients.map(c => ({ ...c, open: false }))),
        [key]
    );

    const toggleOpen = (clientId: string) => {
        setApplications([
            ...applications?.map(a =>
                a.clientId === clientId ? { ...a, open: !a.open } : a
            )
        ]);
    };

    const removeConsent = async (id: string) => {
        try {
            await deleteConsent(context, id);
            refresh();
            addAlert(t("removeConsentSuccess"));
        } catch (error) {
            addError("removeConsentError", error);
        }
    };

    if (!applications) {
        return (
            <div className="flex justify-center py-24">
                <Spinner className="size-6 text-muted-foreground" />
            </div>
        );
    }

    return (
        <Page title={t("application")} description={t("applicationsIntroMessage")}>
            <div className="space-y-7">
                {applications.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <AppWindowIcon />
                            </EmptyMedia>
                            <EmptyDescription>{t("applicationsIntroMessage")}</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <section>
                        <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                            {t("applications")}
                        </h3>
                        <ItemGroup variant="inset">
                            {applications.map((application, index) => {
                                const name = label(
                                    t,
                                    application.clientName || application.clientId
                                );
                                const type = application.userConsentRequired
                                    ? t("thirdPartyApp")
                                    : t("internalApp");
                                const typeLabel = application.offlineAccess
                                    ? `${type}, ${t("offlineAccess")}`
                                    : type;
                                return (
                                    <Fragment key={application.clientId}>
                                        {index > 0 && <ItemSeparator />}
                                        <div
                                            role="listitem"
                                            data-testid="applications-list-item"
                                        >
                                            <Item size="sm">
                                                <ItemMedia variant="icon">
                                                    <AppWindowIcon />
                                                </ItemMedia>
                                                <ItemContent className="min-w-0">
                                                    <ItemTitle>
                                                        {application.effectiveUrl ? (
                                                            <Button
                                                                variant="link"
                                                                size="sm"
                                                                className="h-auto px-0 text-base font-semibold text-foreground"
                                                                onClick={() =>
                                                                    window.open(
                                                                        application.effectiveUrl
                                                                    )
                                                                }
                                                            >
                                                                {name}
                                                                <ArrowSquareOutIcon />
                                                            </Button>
                                                        ) : (
                                                            name
                                                        )}
                                                    </ItemTitle>
                                                    <ItemDescription>{typeLabel}</ItemDescription>
                                                </ItemContent>
                                                <ItemActions>
                                                    {application.inUse ? (
                                                        <Badge variant="outline">
                                                            {t("inUse")}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">
                                                            {t("notInUse")}
                                                        </Badge>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() =>
                                                            toggleOpen(application.clientId)
                                                        }
                                                        id={`toggle-${application.clientId}`}
                                                        aria-controls={`content-${application.clientId}`}
                                                        aria-expanded={application.open}
                                                    >
                                                        <CaretDownIcon
                                                            className={cn(
                                                                "transition-transform",
                                                                application.open && "rotate-180"
                                                            )}
                                                        />
                                                    </Button>
                                                </ItemActions>
                                            </Item>

                                            {application.open && (
                                                <div
                                                    id={`content-${application.clientId}`}
                                                    aria-label={t("applicationDetails", {
                                                        clientId: application.clientId
                                                    })}
                                                    className="space-y-3 px-4 pb-4 text-sm"
                                                >
                                                    <dl className="grid gap-3 sm:grid-cols-2">
                                                        <div>
                                                    <dt className="text-xs font-medium text-muted-foreground">
                                                        {t("client")}
                                                    </dt>
                                                    <dd className="mt-0.5">
                                                        {application.clientId}
                                                    </dd>
                                                </div>
                                                        {application.description && (
                                                            <div>
                                                    <dt className="text-xs font-medium text-muted-foreground">
                                                        {t("description")}
                                                    </dt>
                                                    <dd className="mt-0.5">
                                                        {application.description}
                                                    </dd>
                                                </div>
                                                        )}
                                                        {application.effectiveUrl && (
                                                            <div>
                                                    <dt className="text-xs font-medium text-muted-foreground">
                                                        URL
                                                    </dt>
                                                    <dd className="mt-0.5 break-all">
                                                        {application.effectiveUrl.split('"')}
                                                    </dd>
                                                </div>
                                                        )}
                                                        {application.consent && (
                                                            <>
                                                                {application.tosUri && (
                                                                    <div>
                                                    <dt className="text-xs font-medium text-muted-foreground">
                                                        {t("termsOfService")}
                                                    </dt>
                                                    <dd className="mt-0.5 break-all">
                                                        {application.tosUri}
                                                    </dd>
                                                </div>
                                                                )}
                                                                {application.policyUri && (
                                                                    <div>
                                                    <dt className="text-xs font-medium text-muted-foreground">
                                                        {t("privacyPolicy")}
                                                    </dt>
                                                    <dd className="mt-0.5 break-all">
                                                        {application.policyUri}
                                                    </dd>
                                                </div>
                                                                )}
                                                                {application.logoUri && (
                                                                    <div>
                                                    <dt className="text-xs font-medium text-muted-foreground">
                                                        {t("logo")}
                                                    </dt>
                                                    <dd className="mt-0.5">
                                                        <img src={application.logoUri} />
                                                    </dd>
                                                </div>
                                                                )}
                                                                <div>
                                                    <dt className="text-xs font-medium text-muted-foreground">
                                                        {t("accessGrantedOn")}
                                                    </dt>
                                                    <dd className="mt-0.5 tabular-nums">
                                                        {formatDate(
                                                                        new Date(
                                                                            application.consent
                                                                                .createdDate
                                                                        ),
                                                                        context.environment.locale
                                                                    )}
                                                    </dd>
                                                </div>
                                                            </>
                                                        )}
                                                    </dl>

                                                    {application.consent && (
                                                        <div>
                                                            <dt className="mb-1.5 text-xs font-medium text-muted-foreground">
                                                                {t("hasAccessTo")}
                                                            </dt>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {application.consent.grantedScopes.map(
                                                                    scope => (
                                                                        <Badge
                                                                            key={`scope${scope.id}`}
                                                                            variant="default"
                                                                        >
                                                                            <CheckIcon data-icon="inline-start" />
                                                                            {t(
                                                                                scope.name as TFuncKey,
                                                                                scope.displayText
                                                                            )}
                                                                        </Badge>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {(application.consent ||
                                                        application.offlineAccess) && (
                                                        <>
                                                            <Separator />
                                                            <div className="space-y-2">
                                                                <Confirm>
                                                                    <ConfirmTrigger asChild>
                                                                        <Button variant="destructive">
                                                                            {t("removeAccess")}
                                                                        </Button>
                                                                    </ConfirmTrigger>
                                                                    <ConfirmContent>
                                                                        <ConfirmHeader>
                                                                            <ConfirmTitle>
                                                                                {t("removeAccess")}
                                                                            </ConfirmTitle>
                                                                            <ConfirmDescription>
                                                                                {t(
                                                                                    "removeModalMessage",
                                                                                    {
                                                                                        name: application.clientId
                                                                                    }
                                                                                )}
                                                                            </ConfirmDescription>
                                                                        </ConfirmHeader>
                                                                        <ConfirmFooter>
                                                                            <ConfirmCancel>
                                                                                {t("cancel")}
                                                                            </ConfirmCancel>
                                                                            <ConfirmAction
                                                                                onClick={() =>
                                                                                    removeConsent(
                                                                                        application.clientId
                                                                                    )
                                                                                }
                                                                            >
                                                                                {t("confirm")}
                                                                            </ConfirmAction>
                                                                        </ConfirmFooter>
                                                                    </ConfirmContent>
                                                                </Confirm>
                                                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                    <InfoIcon />
                                                                    {t("infoMessage")}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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

export default Applications;
