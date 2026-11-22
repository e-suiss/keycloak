/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/account-security/DeviceActivity.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { DesktopIcon, DeviceMobileIcon } from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
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
import { Spinner } from "@ui/components/spinner";
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
import { Fragment, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { label, useEnvironment } from "../../shared/keycloak-ui-shared";

import type { AccountEnvironment } from "..";
import { deleteSession, getDevices } from "../api/methods";
import type {
    ClientRepresentation,
    DeviceRepresentation,
    SessionRepresentation
} from "../api/representations";
import { Page } from "../components/page/Page";
import { formatDate } from "../utils/formatDate";
import { useAccountAlerts } from "../utils/useAccountAlerts";
import { usePromise } from "../utils/usePromise";

const ConfirmButton = ({
    trigger,
    title,
    confirmLabel,
    cancelLabel,
    onConfirm,
    children
}: {
    trigger: ReactNode;
    title: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    children: ReactNode;
}) => (
    <Confirm>
        <ConfirmTrigger asChild>{trigger}</ConfirmTrigger>
        <ConfirmContent>
            <ConfirmHeader>
                <ConfirmTitle>{title}</ConfirmTitle>
                <ConfirmDescription>{children}</ConfirmDescription>
            </ConfirmHeader>
            <ConfirmFooter>
                <ConfirmCancel>{cancelLabel}</ConfirmCancel>
                <ConfirmAction onClick={() => onConfirm()}>{confirmLabel}</ConfirmAction>
            </ConfirmFooter>
        </ConfirmContent>
    </Confirm>
);

export const DeviceActivity = () => {
    const { t } = useTranslation();
    const context = useEnvironment<AccountEnvironment>();
    const { addAlert, addError } = useAccountAlerts();

    const [devices, setDevices] = useState<DeviceRepresentation[]>();
    const [key, setKey] = useState(0);
    const refresh = () => setKey(key + 1);

    const moveCurrentToTop = (devices: DeviceRepresentation[]) => {
        let currentDevice = devices[0];

        const index = devices.findIndex(d => d.current);
        currentDevice = devices.splice(index, 1)[0];
        devices.unshift(currentDevice);

        const sessionIndex = currentDevice.sessions.findIndex(s => s.current);
        const currentSession = currentDevice.sessions.splice(sessionIndex, 1)[0];
        currentDevice.sessions.unshift(currentSession);

        setDevices(devices);
    };

    usePromise(signal => getDevices({ signal, context }), moveCurrentToTop, [key]);

    const signOutAll = async () => {
        await deleteSession(context);
        await context.keycloak.logout();
    };

    const signOutSession = async (
        session: SessionRepresentation,
        device: DeviceRepresentation
    ) => {
        try {
            await deleteSession(context, session.id);
            addAlert(t("signedOutSession", { browser: session.browser, os: device.os }));
            refresh();
        } catch (error) {
            addError("errorSignOutMessage", error);
        }
    };

    const makeClientsString = (clients: ClientRepresentation[]): string => {
        let clientsString = "";
        clients.forEach((client, index) => {
            let clientName: string;
            if (client.clientName !== "") {
                clientName = label(t, client.clientName);
            } else {
                clientName = client.clientId;
            }

            clientsString += clientName;

            if (clients.length > index + 1) clientsString += ", ";
        });

        return clientsString;
    };

    if (!devices) {
        return (
            <div className="flex justify-center py-24">
                <Spinner className="size-6 text-muted-foreground" />
            </div>
        );
    }

    const sessionSubtitle = (session: SessionRepresentation) => (
        <ItemDescription className="line-clamp-none">
            <span className="block tabular-nums">{session.ipAddress}</span>
            <span className="block">
                {t("lastAccessedOn")}{" "}
                <span className="tabular-nums">
                    {formatDate(
                        new Date(session.lastAccess * 1000),
                        context.environment.locale
                    )}
                </span>
            </span>
            {makeClientsString(session.clients) && (
                <span className="block">{makeClientsString(session.clients)}</span>
            )}
        </ItemDescription>
    );

    return (
        <Page title={t("deviceActivity")} description={t("signedInDevicesExplanation")}>
            <div className="space-y-7">
                <section>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        {t("signedInDevices")}
                    </h3>
                    <ItemGroup variant="inset">
                        {devices.map((device, deviceIndex) =>
                            device.sessions.map((session, index) => (
                                <Fragment key={device.id}>
                                    {(deviceIndex > 0 || index > 0) && <ItemSeparator />}
                                    <Item
                                        size="sm"
                                        role="listitem"
                                        data-testid={`row-${index}`}
                                    >
                                        <ItemMedia variant="icon">
                                            {device.mobile ? (
                                                <DeviceMobileIcon />
                                            ) : (
                                                <DesktopIcon />
                                            )}
                                        </ItemMedia>
                                        <ItemContent className="min-w-0">
                                            <ItemTitle className="session-title">
                                                {device.os.toLowerCase().includes("unknown")
                                                    ? t("unknownOperatingSystem")
                                                    : device.os}{" "}
                                                {!device.osVersion
                                                    .toLowerCase()
                                                    .includes("unknown") &&
                                                    device.osVersion}{" "}
                                                / {session.browser}
                                            </ItemTitle>
                                            {sessionSubtitle(session)}
                                        </ItemContent>
                                        <ItemActions>
                                            {session.current && (
                                                <Badge variant="outline">
                                                    {t("currentSession")}
                                                </Badge>
                                            )}
                                            {!session.current && (
                                                <ConfirmButton
                                                    trigger={
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                        >
                                                            {t("signOut")}
                                                        </Button>
                                                    }
                                                    title={t("signOut")}
                                                    confirmLabel={t("confirm")}
                                                    cancelLabel={t("cancel")}
                                                    onConfirm={() =>
                                                        signOutSession(session, device)
                                                    }
                                                >
                                                    {t("signOutWarning")}
                                                </ConfirmButton>
                                            )}
                                        </ItemActions>
                                    </Item>
                                </Fragment>
                            ))
                        )}

                        {(devices.length > 1 || devices[0].sessions.length > 1) && (
                            <>
                                <ItemSeparator />
                                <Item size="sm" role="listitem">
                                    <ConfirmButton
                                        trigger={
                                            <Button variant="destructive" block>
                                                {t("signOutAllDevices")}
                                            </Button>
                                        }
                                        title={t("signOutAllDevices")}
                                        confirmLabel={t("confirm")}
                                        cancelLabel={t("cancel")}
                                        onConfirm={() => signOutAll()}
                                    >
                                        {t("signOutAllDevicesWarning")}
                                    </ConfirmButton>
                                </Item>
                            </>
                        )}
                    </ItemGroup>
                </section>
            </div>
        </Page>
    );
};

export default DeviceActivity;
