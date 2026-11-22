/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/permission-tab/PermissionTab.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type { ManagementPermissionReference } from "@keycloak/keycloak-admin-client/lib/defs/managementPermissionReference";
import { Card, CardContent, CardTitle } from "@ui/components/card";
import { DropdownMenuItem } from "@ui/components/dropdown-menu";
import { Label } from "@ui/components/label";
import { Switch } from "@ui/components/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableRowActions
} from "../../../shared/data-table";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { HelpItem, KeycloakSpinner, useFetch } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { toPermissionDetails } from "../../clients/routes/PermissionDetails";
import { useRealm } from "../../context/realm-context/RealmContext";
import useLocaleSort from "../../utils/useLocaleSort";
import { useConfirmDialog } from "../confirm-dialog/ConfirmDialog";

type PermissionScreenType =
    | "clients"
    | "users"
    | "groups"
    | "roles"
    | "identityProviders";

type PermissionsTabProps = {
    id?: string;
    type: PermissionScreenType;
};

export const PermissionsTab = ({ id, type }: PermissionsTabProps) => {
    const { adminClient } = useAdminClient();

    const { t } = useTranslation();
    const navigate = useNavigate();
    const { realm } = useRealm();
    const [realmId, setRealmId] = useState("");
    const [permission, setPermission] = useState<ManagementPermissionReference>();
    const localeSort = useLocaleSort();

    const togglePermissionEnabled = (enabled: boolean) => {
        switch (type) {
            case "clients":
                return adminClient.clients.updateFineGrainPermission(
                    { id: id! },
                    { enabled }
                );
            case "users":
                return adminClient.realms.updateUsersManagementPermissions({
                    realm,
                    enabled
                });
            case "groups":
                return adminClient.groups.updatePermission({ id: id! }, { enabled });
            case "roles":
                return adminClient.roles.updatePermission({ id: id! }, { enabled });
            case "identityProviders":
                return adminClient.identityProviders.updatePermission(
                    { alias: id! },
                    { enabled }
                );
        }
    };

    useFetch(
        () =>
            Promise.all([
                adminClient.clients.find({
                    search: true,
                    clientId: realm === "master" ? "master-realm" : "realm-management"
                }),
                (() => {
                    switch (type) {
                        case "clients":
                            return adminClient.clients.listFineGrainPermissions({
                                id: id!
                            });
                        case "users":
                            return adminClient.realms.getUsersManagementPermissions({
                                realm
                            });
                        case "groups":
                            return adminClient.groups.listPermissions({ id: id! });
                        case "roles":
                            return adminClient.roles.listPermissions({ id: id! });
                        case "identityProviders":
                            return adminClient.identityProviders.listPermissions({
                                alias: id!
                            });
                    }
                })()
            ]),
        ([clients, permission]) => {
            setRealmId(clients[0]?.id!);
            setPermission(permission);
        },
        [id]
    );

    const [toggleDisableDialog, DisableConfirm] = useConfirmDialog({
        titleKey: "permissionsDisable",
        messageKey: "permissionsDisableConfirm",
        continueButtonLabel: "confirm",
        onConfirm: async () => {
            const permission = await togglePermissionEnabled(false);
            setPermission(permission);
        }
    });

    if (!permission) {
        return <KeycloakSpinner />;
    }

    return (
        <section className="p-6">
            <DisableConfirm />
            <Card>
                <CardTitle>{t("permissions")}</CardTitle>
                <CardContent>
                    {t(`${type}PermissionsHint`)}
                    <form className="space-y-4 pt-4">
                        <div className="permission-label space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="permissionsEnabled">
                                    {t("permissionsEnabled")}
                                </Label>
                                <HelpItem
                                    helpText={t("permissionsEnabledHelp")}
                                    fieldLabelId="permissionsEnabled"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="permissionsEnabled"
                                    data-testid="permissionSwitch"
                                    checked={permission.enabled}
                                    onCheckedChange={async enabled => {
                                        if (enabled) {
                                            const permission =
                                                await togglePermissionEnabled(enabled);
                                            setPermission(permission);
                                        } else {
                                            toggleDisableDialog();
                                        }
                                    }}
                                    aria-label={t("permissionsEnabled")}
                                />
                                <span className="text-sm">
                                    {permission.enabled ? t("on") : t("off")}
                                </span>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
            {permission.enabled && (
                <>
                    <Card className="mt-6">
                        <CardTitle>{t("permissionsList")}</CardTitle>
                        <CardContent>
                            <Trans i18nKey="permissionsListIntro">
                                {" "}
                                <strong>
                                    {{
                                        realm:
                                            realm === "master"
                                                ? "master-realm"
                                                : "realm-management"
                                    }}
                                </strong>
                                .
                            </Trans>
                        </CardContent>
                    </Card>
                    <Card className="keycloak__permission__permission-table">
                        <CardContent className="p-0">
                            <Table aria-label={t("permissionsList")}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead id="permissionsScopeName">
                                            {t("permissionsScopeName")}
                                        </TableHead>
                                        <TableHead id="description">
                                            {t("description")}
                                        </TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {localeSort(
                                        Object.entries(permission.scopePermissions || {}),
                                        ([name]) => name
                                    ).map(([name, id]) => (
                                        <TableRow key={id}>
                                            <TableCell>
                                                <Link
                                                    to={toPermissionDetails({
                                                        realm,
                                                        id: realmId,
                                                        permissionType: "scope",
                                                        permissionId: id
                                                    })}
                                                >
                                                    {name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                {t(
                                                    `scopePermissions.${type}.${name}-description`
                                                )}
                                            </TableCell>
                                            <TableCell className="text-end">
                                                <TableRowActions>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            navigate(
                                                                toPermissionDetails({
                                                                    realm,
                                                                    id: realmId,
                                                                    permissionType:
                                                                        "scope",
                                                                    permissionId: id
                                                                })
                                                            );
                                                        }}
                                                    >
                                                        {t("edit")}
                                                    </DropdownMenuItem>
                                                </TableRowActions>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </section>
    );
};
