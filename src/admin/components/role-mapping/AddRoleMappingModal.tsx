/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/role-mapping/AddRoleMappingModal.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import { Input } from "@ui/components/input";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import {
    type ColumnDef,
    flexRender,
    selectionColumn,
    Table,
    TableBody,
    TableCell,
    TableColumnHeader,
    TableHead,
    TableHeader,
    TablePagination,
    TableRow,
    useTable
} from "../../../shared/data-table";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListEmptyState } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useAccess } from "../../context/access/Access";
import { translationFormatter } from "../../utils/translationFormatter";
import useLocaleSort from "../../utils/useLocaleSort";
import { getAvailableRoles } from "./queries";
import type { ResourcesKey, Row } from "./RoleMapping";
import { getAvailableClientRoles } from "./resource";

type AddRoleMappingModalProps = {
    id: string;
    type: ResourcesKey;
    filterType: FilterType;
    name?: string;
    isRadio?: boolean;
    onAssign: (rows: Row[]) => void;
    onClose: () => void;
    title?: string;
    actionLabel?: string;
};

export type FilterType = "roles" | "clients";

const RoleDescription = ({ role }: { role: RoleRepresentation }) => {
    const { t } = useTranslation();
    return (
        <span className="truncate">
            {translationFormatter(t)(role.description) as string}
        </span>
    );
};

type AddRoleButtonProps = {
    label?: string;
    variant?: "default" | "plain" | "primary" | "plainText" | "secondary";
    isDisabled?: boolean;
    onFilerTypeChange: (type: FilterType) => void;
};

export const AddRoleButton = ({
    label,
    variant,
    isDisabled,
    onFilerTypeChange
}: AddRoleButtonProps) => {
    const { t } = useTranslation();

    const { hasAccess } = useAccess();
    const canViewRealmRoles = hasAccess("view-realm") || hasAccess("query-users");

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={variant === "secondary" ? "secondary" : undefined}
                    disabled={isDisabled}
                    data-testid="add-role-mapping-button"
                >
                    {t(label || "assignRole")}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuItem
                    data-testid="client-role"
                    onClick={() => {
                        onFilerTypeChange("clients");
                    }}
                >
                    {t("clientRoles")}
                </DropdownMenuItem>
                {canViewRealmRoles && (
                    <DropdownMenuItem
                        data-testid="roles-role"
                        onClick={() => {
                            onFilerTypeChange("roles");
                        }}
                    >
                        {t("realmRoles")}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const AddRoleMappingModal = ({
    id,
    name,
    type,
    isRadio,
    filterType,
    onAssign,
    onClose,
    title,
    actionLabel
}: AddRoleMappingModalProps) => {
    const { adminClient } = useAdminClient();

    const { t } = useTranslation();
    const [selectedRows, setSelectedRows] = useState<Row[]>([]);
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState<Row[]>([]);

    const localeSort = useLocaleSort();
    const compareRow = ({ role: { name } }: Row) => name?.toUpperCase();

    const isPaginated = !(filterType === "roles" && type !== "roles");

    const loader = async (
        first?: number,
        max?: number,
        search?: string
    ): Promise<Row[]> => {
        const params: Record<string, string | number> = {
            first: first!,
            max: max!
        };

        if (search) {
            params.search = search;
        }

        const roles = await getAvailableRoles(adminClient, type, { ...params, id });
        const sorted = localeSort(roles, compareRow);
        return sorted.map(row => {
            return {
                role: row.role,
                id: row.role.id
            };
        });
    };

    const clientRolesLoader = async (
        first?: number,
        max?: number,
        search?: string
    ): Promise<Row[]> => {
        const roles = await getAvailableClientRoles(adminClient, {
            id,
            type,
            first: first || 0,
            max: max || 10,
            search
        });

        return localeSort(
            roles.map(e => ({
                client: { clientId: e.client, id: e.clientId },
                role: { id: e.id, name: e.role, description: e.description },
                id: e.id
            })),
            ({ client: { clientId }, role: { name } }) => `${clientId}${name}`
        );
    };

    const activeLoader = filterType === "roles" ? loader : clientRolesLoader;

    useEffect(() => {
        let active = true;
        activeLoader(0, isPaginated ? 100 : 1000, search).then(result => {
            if (active) setRows(result ?? []);
        });
        return () => {
            active = false;
        };
    }, [search, isPaginated, activeLoader]);

    const columns = useMemo<ColumnDef<Row>[]>(() => {
        const base: ColumnDef<Row>[] = [
            selectionColumn<Row>(),
            {
                id: "role.name",
                accessorFn: row => row.role.name,
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("name")} />
                ),
                cell: ({ row }) => row.original.role.name
            },
            {
                id: "client.clientId",
                accessorFn: row => row.client?.clientId,
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("clientId")} />
                ),
                cell: ({ row }) => row.original.client?.clientId
            },
            {
                id: "role.description",
                accessorFn: row => row.role.description,
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("description")} />
                ),
                cell: ({ row }) => <RoleDescription role={row.original.role} />
            }
        ];

        if (filterType === "roles") {
            base.splice(2, 1);
        }

        return base;
    }, [t, filterType]);

    const table = useTable({
        data: rows,
        columns,
        pageSize: isPaginated ? 10 : Math.max(rows.length, 1),
        enableRowSelection: true
    });

    const _rowSelection = table.getState().rowSelection;
    useEffect(() => {
        const selected = table.getSelectedRowModel().rows.map(row => row.original);
        setSelectedRows(selected);
    }, [table.getSelectedRowModel]);

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>
                        {title ||
                            t("assignRolesTo", {
                                type: filterType === "roles" ? t("realm") : t("client"),
                                client: name
                            })}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <Input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t(
                            filterType === "roles" ? "searchByRoleName" : "search"
                        )}
                        className="max-w-xs"
                    />
                </div>

                {rows.length === 0 ? (
                    <ListEmptyState
                        message={t("noRoles")}
                        instructions={t("noRealmRolesToAssign")}
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
                        {isPaginated && <TablePagination table={table} />}
                    </>
                )}
            </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        data-testid="cancel"
                        key="cancel"
                        variant="secondary"
                        onClick={onClose}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        data-testid="assign"
                        key="confirm"
                        disabled={selectedRows.length === 0}
                        onClick={() => {
                            onAssign(selectedRows);
                            onClose();
                        }}
                    >
                        {actionLabel || t("assign")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
