/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/resources/PermissionRequest.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { UserCheckIcon, UserIcon } from "@phosphor-icons/react";
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
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";

import { fetchPermission, updateRequest } from "../api";
import type { Permission, Resource } from "../api/representations";
import { useAccountAlerts } from "../utils/useAccountAlerts";

type PermissionRequestProps = {
    resource: Resource;
    refresh: () => void;
};

export const PermissionRequest = ({ resource, refresh }: PermissionRequestProps) => {
    const { t } = useTranslation();
    const context = useEnvironment();
    const { addAlert, addError } = useAccountAlerts();

    const [open, setOpen] = useState(false);

    const toggle = () => setOpen(!open);

    const approveDeny = async (shareRequest: Permission, approve: boolean = false) => {
        try {
            const permissions = await fetchPermission({ context }, resource._id);
            const { scopes, username } = permissions.find(
                p => p.username === shareRequest.username
            ) || { scopes: [], username: shareRequest.username };

            await updateRequest(
                context,
                resource._id,
                username,
                approve
                    ? [...(scopes as string[]), ...(shareRequest.scopes as string[])]
                    : scopes
            );
            addAlert(t("shareSuccess"));
            toggle();
            refresh();
        } catch (error) {
            addError("shareError", error);
        }
    };

    return (
        <>
            <Button variant="ghost" onClick={toggle}>
                <UserCheckIcon />
                <Badge>{resource.shareRequests?.length}</Badge>
            </Button>
            <Modal open={open} onOpenChange={next => !next && toggle()}>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>
                            {t("permissionRequest", { name: resource.name })}
                        </ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <ItemGroup variant="inset">
                            {resource.shareRequests?.map((shareRequest, index) => (
                                <Fragment key={shareRequest.username}>
                                    {index > 0 && <ItemSeparator />}
                                    <Item size="sm">
                                        <ItemMedia variant="icon">
                                            <UserIcon />
                                        </ItemMedia>
                                        <ItemContent>
                                            <ItemTitle>
                                                {shareRequest.firstName}{" "}
                                                {shareRequest.lastName}{" "}
                                                {shareRequest.lastName
                                                    ? ""
                                                    : shareRequest.username}
                                            </ItemTitle>
                                            <ItemDescription className="flex flex-wrap items-center gap-1.5">
                                                {shareRequest.email && (
                                                    <span>{shareRequest.email}</span>
                                                )}
                                                {shareRequest.scopes.map(scope => (
                                                    <Badge
                                                        key={scope.toString()}
                                                        variant="outline"
                                                    >
                                                        {scope as string}
                                                    </Badge>
                                                ))}
                                            </ItemDescription>
                                        </ItemContent>
                                        <ItemActions>
                                            <Button
                                                size="sm"
                                                onClick={async () => {
                                                    await approveDeny(shareRequest, true);
                                                }}
                                            >
                                                {t("accept")}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={async () => {
                                                    await approveDeny(shareRequest);
                                                }}
                                            >
                                                {t("deny")}
                                            </Button>
                                        </ItemActions>
                                    </Item>
                                </Fragment>
                            ))}
                        </ItemGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="secondary" onClick={toggle}>
                            {t("close")}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};
