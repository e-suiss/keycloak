/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/role-mapping/RoleMapping.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import type ClientRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientRepresentation";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { DropdownMenuItem } from "@ui/components/dropdown-menu";
import { Field, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
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
    TableRowActions,
    useTable
} from "../../../shared/data-table";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListEmptyState, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { emptyFormatter, upperCaseFormatter } from "../../util";
import { translationFormatter } from "../../utils/translationFormatter";
import { useConfirmDialog } from "../confirm-dialog/ConfirmDialog";
import {
    AddRoleButton,
    AddRoleMappingModal,
    type FilterType
} from "./AddRoleMappingModal";
import { deleteMapping, getMapping } from "./queries";
import { getAllEffectiveRoles } from "./resource";

export type CompositeRole = RoleRepresentation & {
    parent: RoleRepresentation;
    isInherited?: boolean;
};

export type Row = {
    client?: ClientRepresentation;
    role: RoleRepresentation | CompositeRole;
    id?: string;
};

export const mapRoles = (assignedRoles: Row[], effectiveRoles: Row[], hide: boolean) => [
    ...(hide
        ? assignedRoles.map(row => ({
              id: row.role.id,
              ...row,
              role: {
                  ...row.role,
                  isInherited: false
              }
          }))
        : effectiveRoles.map(row => ({
              id: row.role.id,
              ...row,
              role: {
                  ...row.role,
                  isInherited:
                      assignedRoles.find(r => r.role.id === row.role.id) === undefined
              }
          })))
];

export const ServiceRole = ({ role, client }: Row) => (
    <>
        {client?.clientId && (
            <Badge
                variant="secondary"
                className="keycloak-admin--role-mapping__client-name"
            >
                {client.clientId}
            </Badge>
        )}
        {role.name}
    </>
);

export type ResourcesKey = keyof KeycloakAdminClient;

type RoleMappingProps = {
    name: string;
    id: string;
    type: ResourcesKey;
    isManager?: boolean;
    save: (rows: Row[]) => Promise<void>;
};

export const RoleMapping = ({
    name,
    id,
    type,
    isManager = true,
    save
}: RoleMappingProps) => {
    const { adminClient } = useAdminClient();

    const { t } = useTranslation();
    const { addAlert, addError } = useAlerts();

    const [key, setKey] = useState(0);
    const refresh = () => setKey(key + 1);

    const [hide, setHide] = useState(true);
    const [showAssign, setShowAssign] = useState(false);
    const [filterType, setFilterType] = useState<FilterType>("clients");
    const [selected, setSelected] = useState<Row[]>([]);
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState<Row[]>([]);

    const assignRoles = async (rows: Row[]) => {
        await save(rows);
        refresh();
    };

    const loader = async () => {
        let allEffectiveRoles: Row[] = [];

        if (!hide) {
            const effectiveRoles = await getAllEffectiveRoles(adminClient, {
                type,
                id
            });

            allEffectiveRoles = effectiveRoles.map(e => ({
                ...(e.clientRole && e.client && e.clientId
                    ? { client: { clientId: e.client, id: e.clientId } }
                    : {}),
                role: { id: e.id, name: e.name, description: e.description }
            }));
        }

        const roles = await getMapping(adminClient, type, id);
        const realmRolesMapping = roles.realmMappings?.map(role => ({ role })) || [];
        const clientMapping = Object.values(roles.clientMappings || {}).flatMap(client =>
            client.mappings.map((role: RoleRepresentation) => ({
                client: { clientId: client.client, ...client },
                role
            }))
        );

        return [
            ...mapRoles([...clientMapping, ...realmRolesMapping], allEffectiveRoles, hide)
        ];
    };

    useEffect(() => {
        let active = true;
        loader().then(result => {
            if (active) setRows(result ?? []);
        });
        return () => {
            active = false;
        };
    }, [loader]);

    const filteredRows = useMemo(() => {
        if (!search) return rows;
        const term = search.toLowerCase();
        return rows.filter(row => row.role.name?.toLowerCase().includes(term));
    }, [rows, search]);

    const [toggleDeleteDialog, DeleteConfirm] = useConfirmDialog({
        titleKey: "removeMappingTitle",
        messageKey: t("removeMappingConfirm", { count: selected.length }),
        continueButtonLabel: "remove",
        continueButtonVariant: "destructive",
        onCancel: () => {
            setSelected([]);
            refresh();
        },
        onConfirm: async () => {
            try {
                await Promise.all(deleteMapping(adminClient, type, id, selected));
                addAlert(t("roleMappingUpdatedSuccess"), "success");
                setSelected([]);
                refresh();
            } catch (error) {
                addError("roleMappingUpdatedError", error);
            }
        }
    });

    const columns = useMemo<ColumnDef<Row>[]>(() => {
        const base: ColumnDef<Row>[] = [
            selectionColumn<Row>(),
            {
                accessorKey: "role.name",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("name")} />
                ),
                cell: ({ row }) => <ServiceRole {...row.original} />
            },
            {
                accessorKey: "role.isInherited",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("inherent")} />
                ),
                cell: ({ getValue }) =>
                    emptyFormatter()(upperCaseFormatter()(getValue() as string))
            },
            {
                accessorKey: "role.description",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("description")} />
                ),
                cell: ({ getValue }) => (
                    <span className="truncate">
                        {translationFormatter(t)(getValue() as string)}
                    </span>
                )
            }
        ];

        if (isManager) {
            base.push({
                id: "actions",
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="text-end">
                        <TableRowActions>
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelected([row.original]);
                                    toggleDeleteDialog();
                                }}
                            >
                                {t("unAssignRole")}
                            </DropdownMenuItem>
                        </TableRowActions>
                    </div>
                )
            });
        }

        return base;
    }, [t, isManager, toggleDeleteDialog]);

    const table = useTable({
        data: filteredRows,
        columns,
        pageSize: 10,
        enableRowSelection: true
    });

    useEffect(() => {
        setSelected(table.getFilteredSelectedRowModel().rows.map(r => r.original));
    }, [table.getFilteredSelectedRowModel]);

    return (
        <>
            {showAssign && (
                <AddRoleMappingModal
                    id={id}
                    type={type}
                    filterType={filterType}
                    name={name}
                    onAssign={assignRoles}
                    onClose={() => setShowAssign(false)}
                />
            )}
            <DeleteConfirm />
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <Input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t("searchByName")}
                        className="max-w-xs"
                    />
                    <div className="flex items-center gap-3">
                        <Field orientation="horizontal" className="w-auto">
                            <Checkbox
                                id="hideInheritedRoles"
                                data-testid="hideInheritedRoles"
                                checked={hide}
                                onCheckedChange={check => {
                                    setHide(!!check);
                                    refresh();
                                }}
                            />
                            <FieldLabel htmlFor="hideInheritedRoles">
                                {t("hideInheritedRoles")}
                            </FieldLabel>
                        </Field>
                        {isManager && (
                            <>
                                <AddRoleButton
                                    onFilerTypeChange={type => {
                                        setFilterType(type);
                                        setShowAssign(true);
                                    }}
                                />
                                <Button
                                    variant="link"
                                    data-testid="unAssignRole"
                                    onClick={toggleDeleteDialog}
                                    disabled={selected.length === 0}
                                >
                                    {t("unAssignRole")}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {filteredRows.length === 0 ? (
                    <ListEmptyState
                        message={t(`noRoles-${type}`)}
                        instructions={t(`noRolesInstructions-${type}`)}
                        secondaryActions={[
                            {
                                text: t("showInheritedRoles"),
                                onClick: () => {
                                    setHide(false);
                                    refresh();
                                }
                            }
                        ]}
                    >
                        <AddRoleButton
                            onFilerTypeChange={type => {
                                setFilterType(type);
                                setShowAssign(true);
                            }}
                        />
                    </ListEmptyState>
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
                        <TablePagination table={table} />
                    </>
                )}
            </div>
        </>
    );
};
