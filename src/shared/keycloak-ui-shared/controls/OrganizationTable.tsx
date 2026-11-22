/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/OrganizationTable.tsx"
 *
 * This file is provided by @keycloakify/keycloak-ui-shared version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type OrganizationRepresentation from "@keycloak/keycloak-admin-client/lib/defs/organizationRepresentation";
import { Badge } from "@ui/components/badge";
import { DropdownMenuItem } from "@ui/components/dropdown-menu";
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
} from "../../data-table";
import {
    type FunctionComponent,
    type PropsWithChildren,
    type ReactNode,
    useEffect,
    useMemo,
    useState
} from "react";
import { useTranslation } from "react-i18next";

type LoaderFunction<T> = (first?: number, max?: number, search?: string) => Promise<T[]>;
type Action<T> = {
    title?: any;
    onRowClick?: (row: T) => any;
    [key: string]: any;
};

type OrgDetailLinkProps = {
    link: FunctionComponent<
        PropsWithChildren<{ organization: OrganizationRepresentation }>
    >;
    organization: OrganizationRepresentation;
};

const OrgDetailLink = ({ link, organization }: OrgDetailLinkProps) => {
    const { t } = useTranslation();
    const Component = link;
    return (
        <span className="truncate">
            <Component organization={organization}>
                {organization.name}
                {!organization.enabled && (
                    <Badge
                        key={`${organization.id}-disabled`}
                        variant="secondary"
                        className="ml-2"
                    >
                        {t("disabled")}
                    </Badge>
                )}
            </Component>
        </span>
    );
};

const Domains = (org: OrganizationRepresentation) => {
    return (
        <div className="flex flex-wrap gap-1.5">
            {org.domains?.map(dn => {
                const name = typeof dn === "string" ? dn : dn.name;
                return (
                    <Badge key={name} variant="secondary">
                        {name}
                    </Badge>
                );
            })}
        </div>
    );
};

export type OrganizationTableProps = PropsWithChildren & {
    loader: LoaderFunction<OrganizationRepresentation> | OrganizationRepresentation[];
    link: FunctionComponent<
        PropsWithChildren<{ organization: OrganizationRepresentation }>
    >;
    toolbarItem?: ReactNode;
    isPaginated?: boolean;
    isSearching?: boolean;
    searchPlaceholderKey?: string;
    onSelect?: (orgs: OrganizationRepresentation[]) => void;
    onDelete?: (org: OrganizationRepresentation) => void;
    deleteLabel?: string;
    actions?: Action<OrganizationRepresentation>[];
};

export const OrganizationTable = ({
    loader,
    toolbarItem,
    isPaginated = false,
    isSearching = false,
    searchPlaceholderKey,
    onSelect,
    onDelete,
    deleteLabel = "delete",
    link,
    children,
    actions
}: OrganizationTableProps) => {
    const { t } = useTranslation();

    const enableRowSelection = onSelect !== undefined;

    const [search, setSearch] = useState("");
    const [rows, setRows] = useState<OrganizationRepresentation[]>([]);
    const [_refresh, _setRefresh] = useState(0);

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (typeof loader === "function") {
                const result = await loader(
                    0,
                    isPaginated ? 100 : 1000,
                    isSearching ? search : undefined
                );
                if (active) setRows(result ?? []);
            } else {
                if (active) setRows(loader ?? []);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [loader, search, isPaginated, isSearching]);

    const rowActions = useMemo<Action<OrganizationRepresentation>[]>(
        () => [
            ...(onDelete ? [{ title: t(deleteLabel), onRowClick: onDelete }] : []),
            ...(actions ?? [])
        ],
        [onDelete, deleteLabel, actions, t]
    );

    const columns = useMemo<ColumnDef<OrganizationRepresentation>[]>(() => {
        const base: ColumnDef<OrganizationRepresentation>[] = [
            {
                accessorKey: "name",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("name")} />
                ),
                cell: ({ row }) => (
                    <OrgDetailLink link={link} organization={row.original} />
                )
            },
            {
                accessorKey: "domains",
                enableSorting: false,
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("domains")} />
                ),
                cell: ({ row }) => <Domains {...row.original} />
            },
            {
                accessorKey: "description",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("description")} />
                )
            },
            {
                accessorKey: "membershipType",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("membershipType")} />
                )
            }
        ];

        if (enableRowSelection) {
            base.unshift(selectionColumn<OrganizationRepresentation>());
        }

        if (rowActions.length > 0) {
            base.push({
                id: "actions",
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="text-end">
                        <TableRowActions>
                            {rowActions.map((action, index) => (
                                <DropdownMenuItem
                                    key={`${action.title}-${index}`}
                                    onClick={() => action.onRowClick?.(row.original)}
                                >
                                    {action.title}
                                </DropdownMenuItem>
                            ))}
                        </TableRowActions>
                    </div>
                )
            });
        }

        return base;
    }, [t, link, enableRowSelection, rowActions]);

    const table = useTable({
        data: rows,
        columns,
        pageSize: isPaginated ? 10 : Math.max(rows.length, 1),
        enableRowSelection
    });

    const _rowSelection = table.getState().rowSelection;

    useEffect(() => {
        if (!onSelect) return;
        onSelect(table.getSelectedRowModel().rows.map(row => row.original));
    }, [onSelect, table.getSelectedRowModel]);

    return (
        <div className="space-y-4">
            {(isSearching || toolbarItem) && (
                <div className="flex items-center justify-between gap-3">
                    {isSearching ? (
                        <Input
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t(searchPlaceholderKey ?? "search")}
                            className="max-w-xs"
                        />
                    ) : (
                        <span />
                    )}
                    {toolbarItem}
                </div>
            )}

            {rows.length === 0 ? (
                children
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
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
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
    );
};
