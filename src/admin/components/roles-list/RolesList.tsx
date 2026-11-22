/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/roles-list/RolesList.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation";
import { Button } from "@ui/components/button";
import { DropdownMenuItem } from "@ui/components/dropdown-menu";
import { Input } from "@ui/components/input";
import {
    type ColumnDef,
    flexRender,
    Table,
    TableBody,
    TableCell,
    TableColumnHeader,
    TableHead,
    TableHeader,
    TablePagination,
    TableRow,
    TableRowActions,
    useTable
} from "../../../shared/data-table";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, type To, useNavigate } from "react-router-dom";
import { HelpItem, ListEmptyState, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useAccess } from "../../context/access/Access";
import { useRealm } from "../../context/realm-context/RealmContext";
import { toRealmSettings } from "../../realm-settings/routes/RealmSettings";
import { translationFormatter } from "../../utils/translationFormatter";
import { useConfirmDialog } from "../confirm-dialog/ConfirmDialog";

type RoleDetailLinkProps = RoleRepresentation & {
    defaultRoleName?: string;
    toDetail: (roleId: string) => To;
    messageBundle?: string;
};

const RoleDetailLink = ({ defaultRoleName, toDetail, ...role }: RoleDetailLinkProps) => {
    const { t } = useTranslation();
    const { realm } = useRealm();
    const { hasAccess, hasSomeAccess } = useAccess();
    const canViewUserRegistration =
        hasAccess("view-realm") && hasSomeAccess("view-clients", "manage-clients");

    return role.name !== defaultRoleName ? (
        <Link to={toDetail(role.id!)}>{role.name}</Link>
    ) : (
        <>
            {canViewUserRegistration ? (
                <Link to={toRealmSettings({ realm, tab: "user-registration" })}>
                    {role.name}
                </Link>
            ) : (
                <span>{role.name}</span>
            )}{" "}
            <HelpItem helpText={t("defaultRole")} fieldLabelId="defaultRole" />
        </>
    );
};

type RolesListProps = {
    paginated?: boolean;
    parentRoleId?: string;
    messageBundle?: string;
    isReadOnly: boolean;
    toCreate: To;
    toDetail: (roleId: string) => To;
    loader?: (
        first?: number,
        max?: number,
        search?: string
    ) => Promise<RoleRepresentation[]>;
};

export const RolesList = ({
    loader,
    paginated = true,
    parentRoleId,
    messageBundle = "roles",
    toCreate,
    toDetail,
    isReadOnly
}: RolesListProps) => {
    const { adminClient } = useAdminClient();

    const { t } = useTranslation();
    const navigate = useNavigate();
    const { addAlert, addError } = useAlerts();
    const { realmRepresentation: realm } = useRealm();

    const [selectedRole, setSelectedRole] = useState<RoleRepresentation>();
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState<RoleRepresentation[]>([]);
    const [_refresh, setRefresh] = useState(0);

    useEffect(() => {
        let active = true;
        loader?.(0, paginated ? 100 : 1000, search).then(result => {
            if (active) setRows(result ?? []);
        });
        return () => {
            active = false;
        };
    }, [loader, search, paginated]);

    const [toggleDeleteDialog, DeleteConfirm] = useConfirmDialog({
        titleKey: "roleDeleteConfirm",
        messageKey: t("roleDeleteConfirmDialog", {
            selectedRoleName: selectedRole ? selectedRole?.name : ""
        }),
        continueButtonLabel: "delete",
        continueButtonVariant: "destructive",
        onConfirm: async () => {
            try {
                if (!parentRoleId) {
                    await adminClient.roles.delById({
                        id: selectedRole?.id!
                    });
                } else {
                    await adminClient.roles.delCompositeRoles({ id: parentRoleId }, [
                        selectedRole!
                    ]);
                }
                setSelectedRole(undefined);
                setRefresh(r => r + 1);
                addAlert(t("roleDeletedSuccess"), "success");
            } catch (error) {
                addError("roleDeleteError", error);
            }
        }
    });

    const columns = useMemo<ColumnDef<RoleRepresentation>[]>(() => {
        const base: ColumnDef<RoleRepresentation>[] = [
            {
                accessorKey: "name",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("roleName")} />
                ),
                cell: ({ row }) => (
                    <RoleDetailLink
                        {...row.original}
                        defaultRoleName={realm?.defaultRole?.name}
                        toDetail={toDetail}
                        messageBundle={messageBundle}
                    />
                )
            },
            {
                accessorKey: "composite",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("composite")} />
                ),
                cell: ({ getValue }) => {
                    const value = getValue();
                    return value !== undefined && value !== null && value !== ""
                        ? String(value).toUpperCase()
                        : "—";
                }
            },
            {
                accessorKey: "description",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("description")} />
                ),
                cell: ({ getValue }) => translationFormatter(t)(getValue() as string)
            }
        ];

        if (!isReadOnly) {
            base.push({
                id: "actions",
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="text-end">
                        <TableRowActions>
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => {
                                    const role = row.original;
                                    setSelectedRole(role);
                                    if (
                                        realm?.defaultRole &&
                                        role.name === realm?.defaultRole?.name
                                    ) {
                                        addAlert(t("defaultRoleDeleteError"), "danger");
                                    } else toggleDeleteDialog();
                                }}
                            >
                                {t("delete")}
                            </DropdownMenuItem>
                        </TableRowActions>
                    </div>
                )
            });
        }

        return base;
    }, [t, realm, isReadOnly, toDetail, messageBundle, toggleDeleteDialog, addAlert]);

    const table = useTable({
        data: rows,
        columns,
        pageSize: paginated ? 10 : Math.max(rows.length, 1)
    });

    return (
        <>
            <DeleteConfirm />
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <Input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t("searchForRoles")}
                        className="max-w-xs"
                    />
                    {!isReadOnly && (
                        <Button data-testid="create-role" asChild>
                            <Link to={toCreate}>{t("createRole")}</Link>
                        </Button>
                    )}
                </div>

                {rows.length === 0 ? (
                    <ListEmptyState
                        hasIcon={true}
                        message={t(`noRoles-${messageBundle}`)}
                        instructions={
                            isReadOnly ? "" : t(`noRolesInstructions-${messageBundle}`)
                        }
                        primaryActionText={isReadOnly ? "" : t("createRole")}
                        onPrimaryAction={() => navigate(toCreate)}
                    />
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column.columnDef.header,
                                                          header.getContext()
                                                      )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.map(row => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {paginated && <TablePagination table={table} />}
                    </>
                )}
            </div>
        </>
    );
};
