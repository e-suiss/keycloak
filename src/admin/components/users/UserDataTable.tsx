/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/users/UserDataTable.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { NetworkError } from "@keycloak/keycloak-admin-client";
import type { UserProfileConfig } from "@keycloak/keycloak-admin-client/lib/defs/userProfileMetadata";
import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation";
import {
    ArrowRightIcon,
    InfoIcon,
    WarningCircleIcon,
    WarningIcon,
    XIcon
} from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { DropdownMenuItem } from "@ui/components/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader } from "@ui/components/empty";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/tooltip";
import { type JSX, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
    KeycloakSpinner,
    ListEmptyState,
    useAlerts,
    useFetch
} from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useAccess } from "../../context/access/Access";
import { fetchRealmInfo } from "../../context/auth/admin-ui-endpoint";
import type { UiRealmInfo } from "../../context/auth/uiRealmInfo";
import { useRealm } from "../../context/realm-context/RealmContext";
import { toAddUser } from "../../user/routes/AddUser";
import { toUser } from "../../user/routes/User";
import { emptyFormatter } from "../../util";
import { useConfirmDialog } from "../confirm-dialog/ConfirmDialog";
import DropdownPanel from "../dropdown-panel/DropdownPanel";
import { type BruteUser, findUsers } from "../role-mapping/resource";
import { UserDataTableAttributeSearchForm } from "./UserDataTableAttributeSearchForm";

export type UserFilter = {
    exact: boolean;
    userAttribute: UserAttribute[];
};

export type UserAttribute = {
    name: string;
    displayName: string;
    value: string;
};

const UserDetailLink = (user: BruteUser) => {
    const { t } = useTranslation();
    const { realm } = useRealm();
    return (
        <>
            <Button variant="link" size="sm" className="px-0" asChild>
                <Link to={toUser({ realm, id: user.id!, tab: "settings" })}>
                    {user.username}
                    <StatusRow user={user} />
                </Link>
            </Button>
            {user.attributes?.is_temporary_admin?.[0] === "true" && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <WarningIcon className="ml-1" id="temporary-admin-label" />
                    </TooltipTrigger>
                    <TooltipContent>{t("temporaryAdmin")}</TooltipContent>
                </Tooltip>
            )}
        </>
    );
};

type StatusRowProps = {
    user: BruteUser;
};

const StatusRow = ({ user }: StatusRowProps) => {
    const { t } = useTranslation();
    return (
        <>
            {!user.enabled && (
                <Badge variant="secondary" className="gap-1">
                    <InfoIcon />
                    {t("disabled")}
                </Badge>
            )}
            {user.bruteForceStatus?.disabled && (
                <Badge variant="secondary" className="gap-1">
                    <WarningIcon />
                    {t("temporaryLocked")}
                </Badge>
            )}
        </>
    );
};

const ValidatedEmail = (user: UserRepresentation) => {
    const { t } = useTranslation();
    return (
        <>
            {!user.emailVerified && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <WarningCircleIcon className="keycloak__user-section__email-verified" />
                    </TooltipTrigger>
                    <TooltipContent>{t("notVerified")}</TooltipContent>
                </Tooltip>
            )}{" "}
            {emptyFormatter()(user.email) as JSX.Element}
        </>
    );
};

export function UserDataTable() {
    const { adminClient } = useAdminClient();

    const { t } = useTranslation();
    const { addAlert, addError } = useAlerts();
    const { realm: realmName, realmRepresentation: realm } = useRealm();
    const { hasAccess } = useAccess();
    const navigate = useNavigate();
    const [uiRealmInfo, setUiRealmInfo] = useState<UiRealmInfo>({});
    const [searchUser, setSearchUser] = useState("");
    const [selectedRows, setSelectedRows] = useState<UserRepresentation[]>([]);
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<UserFilter>({
        exact: false,
        userAttribute: []
    });
    const [profile, setProfile] = useState<UserProfileConfig>({});
    const [query, setQuery] = useState("");

    const [rows, setRows] = useState<UserRepresentation[]>([]);
    const [_key, setKey] = useState(0);
    const refresh = () => setKey(k => k + 1);

    // Only needs query-users access to attempt add/delete of users.
    const isManager = hasAccess("query-users");

    useFetch(
        async () => {
            try {
                return await Promise.all([
                    fetchRealmInfo(adminClient),
                    adminClient.users.getProfile()
                ]);
            } catch (error) {
                if (error instanceof NetworkError && error?.response?.status === 403) {
                    // "User Profile" attributes not available for Users Attribute search, when admin user does not have view- or manage-realm realm-management role
                    return [{}, {}] as [UiRealmInfo, UserProfileConfig];
                } else {
                    throw error;
                }
            }
        },
        ([uiRealmInfo, profile]) => {
            setUiRealmInfo(uiRealmInfo);
            setProfile(profile);
        },
        []
    );

    //should *only* list users when no user federation is configured
    const listUsers = !uiRealmInfo.userProfileProvidersEnabled;

    const loader = async (first?: number, max?: number, search?: string) => {
        const params: { [name: string]: string | number | boolean } = {
            first: first!,
            max: max!,
            q: query!
        };

        const searchParam = search || searchUser || "";
        if (searchParam) {
            params.search = searchParam;
        }

        if (activeFilters.exact) params.exact = true;

        if (!listUsers && !(params.search || params.q)) {
            return [];
        }

        try {
            return await findUsers(adminClient, {
                briefRepresentation: true,
                ...params
            });
        } catch (error) {
            if (uiRealmInfo.userProfileProvidersEnabled) {
                addError("noUsersFoundErrorStorage", error);
            } else {
                addError("noUsersFoundError", error);
            }
            return [];
        }
    };

    useEffect(() => {
        if (uiRealmInfo.userProfileProvidersEnabled === undefined || !realm) {
            return;
        }
        let active = true;
        loader(0, 100, searchUser).then(result => {
            if (active) setRows(result ?? []);
        });
        return () => {
            active = false;
        };
    }, [searchUser, uiRealmInfo.userProfileProvidersEnabled, realm, loader]);

    const [toggleUnlockUsersDialog, UnlockUsersConfirm] = useConfirmDialog({
        titleKey: "unlockAllUsers",
        messageKey: "unlockUsersConfirm",
        continueButtonLabel: "unlock",
        onConfirm: async () => {
            try {
                await adminClient.attackDetection.delAll();
                refresh();
                addAlert(t("unlockUsersSuccess"), "success");
            } catch (error) {
                addError("unlockUsersError", error);
            }
        }
    });

    const [toggleDeleteDialog, DeleteConfirm] = useConfirmDialog({
        titleKey: t("deleteConfirmUsers", {
            count: selectedRows.length,
            name: selectedRows[0]?.username
        }),
        messageKey: t("deleteConfirmDialog", { count: selectedRows.length }),
        continueButtonLabel: "delete",
        continueButtonVariant: "destructive",
        onConfirm: async () => {
            try {
                for (const user of selectedRows) {
                    await adminClient.users.del({ id: user.id! });
                }
                setSelectedRows([]);
                clearAllFilters();
                addAlert(t("userDeletedSuccess"), "success");
            } catch (error) {
                addError("userDeletedError", error);
            }
        }
    });

    const goToCreate = () => navigate(toAddUser({ realm: realmName }));

    const clearAllFilters = () => {
        setActiveFilters({ exact: false, userAttribute: [] });
        setSearchUser("");
        setQuery("");
        refresh();
    };

    const createQueryString = (filters: UserFilter) => {
        return filters.userAttribute
            .map(filter => `${filter.name}:${filter.value}`)
            .join(" ");
    };

    const searchUserWithAttributes = () => {
        const attributes = createQueryString(activeFilters);
        setQuery(attributes);
        refresh();
    };

    const createAttributeSearchChips = () => {
        return (
            <div>
                {activeFilters.userAttribute.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {Object.values(activeFilters.userAttribute).map(entry => {
                            const removeFilter = (
                                event: React.MouseEvent<HTMLButtonElement>
                            ) => {
                                event.stopPropagation();

                                const filtered = [...activeFilters.userAttribute].filter(
                                    chip => chip.name !== entry.name
                                );
                                const active = {
                                    userAttribute: filtered,
                                    exact: activeFilters.exact
                                };

                                setActiveFilters(active);
                                setQuery(createQueryString(active));
                                refresh();
                            };
                            return (
                                <div
                                    className="flex items-center gap-1"
                                    data-testid="user-attribute-search-chips-group"
                                    key={entry.name}
                                >
                                    <span className="text-muted-foreground text-sm">
                                        {entry.displayName.length
                                            ? entry.displayName
                                            : entry.name}
                                    </span>
                                    <Badge variant="secondary" className="gap-1">
                                        {entry.value}
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            aria-label={t("remove")}
                                            onClick={removeFilter}
                                        >
                                            <XIcon />
                                        </Button>
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const columns = useMemo<ColumnDef<UserRepresentation>[]>(() => {
        const base: ColumnDef<UserRepresentation>[] = [
            selectionColumn<UserRepresentation>(),
            {
                accessorKey: "username",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("username")} />
                ),
                cell: ({ row }) => UserDetailLink(row.original as BruteUser)
            },
            {
                accessorKey: "email",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("email")} />
                ),
                cell: ({ row }) => ValidatedEmail(row.original)
            },
            {
                accessorKey: "lastName",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("lastName")} />
                ),
                cell: ({ getValue }) => emptyFormatter()(getValue() as string)
            },
            {
                accessorKey: "firstName",
                header: ({ column }) => (
                    <TableColumnHeader column={column} title={t("firstName")} />
                ),
                cell: ({ getValue }) => emptyFormatter()(getValue() as string)
            },
            {
                id: "actions",
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="text-end">
                        <TableRowActions>
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => {
                                    setSelectedRows([row.original]);
                                    toggleDeleteDialog();
                                }}
                            >
                                {t("delete")}
                            </DropdownMenuItem>
                        </TableRowActions>
                    </div>
                )
            }
        ];
        return base;
    }, [t, toggleDeleteDialog]);

    const table = useTable({
        data: rows,
        columns,
        pageSize: 10,
        enableRowSelection: true
    });

    // sync selection back to local state (replaces onSelect)
    const _selectedKey = JSON.stringify(table.getState().rowSelection);
    useEffect(() => {
        setSelectedRows(table.getFilteredSelectedRowModel().rows.map(r => r.original));
    }, [table.getFilteredSelectedRowModel]);

    if (uiRealmInfo.userProfileProvidersEnabled === undefined || !realm) {
        return <KeycloakSpinner />;
    }

    const attributeSearchInput = () => (
        <div className="flex items-center gap-2">
            <DropdownPanel
                data-testid="select-attributes-dropdown"
                buttonText={t("selectAttributes")}
                setSearchDropdownOpen={setSearchDropdownOpen}
                searchDropdownOpen={searchDropdownOpen}
                width="15vw"
            >
                <UserDataTableAttributeSearchForm
                    activeFilters={activeFilters}
                    setActiveFilters={setActiveFilters}
                    profile={profile}
                    createAttributeSearchChips={createAttributeSearchChips}
                    clearAllFilters={clearAllFilters}
                    searchUserWithAttributes={() => {
                        searchUserWithAttributes();
                        setSearchDropdownOpen(false);
                    }}
                />
            </DropdownPanel>
            <Button
                variant="ghost"
                onClick={() => {
                    searchUserWithAttributes();
                    setSearchDropdownOpen(false);
                }}
                aria-label={t("searchAttributes")}
            >
                <ArrowRightIcon />
            </Button>
        </div>
    );

    const toolbar = () => (
        <div className="flex flex-wrap items-center gap-2">
            <Input
                type="search"
                data-testid="table-search-input"
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                placeholder={t("searchForUser")}
                aria-label={t("search")}
                className="max-w-xs"
            />
            {attributeSearchInput()}
            {isManager && (
                <>
                    <Button data-testid="add-user" onClick={goToCreate}>
                        {t("addUser")}
                    </Button>
                    <Button
                        variant="link"
                        onClick={toggleDeleteDialog}
                        data-testid="delete-user-btn"
                        disabled={selectedRows.length === 0}
                    >
                        {t("deleteUser")}
                    </Button>
                    {realm.bruteForceProtected && (
                        <Button
                            variant="link"
                            onClick={toggleUnlockUsersDialog}
                            data-testid="unlock-users-btn"
                        >
                            {t("unlockAllUsers")}
                        </Button>
                    )}
                </>
            )}
        </div>
    );

    const subtoolbar = () => {
        if (!activeFilters.userAttribute.length) {
            return null;
        }
        return (
            <div className="user-attribute-search-form-subtoolbar flex flex-wrap items-center gap-2">
                {createAttributeSearchChips()}
                <Button
                    variant="link"
                    onClick={() => {
                        clearAllFilters();
                    }}
                >
                    {t("clearAllFilters")}
                </Button>
            </div>
        );
    };

    return (
        <>
            <DeleteConfirm />
            <UnlockUsersConfirm />
            <div className="space-y-4">
                {toolbar()}
                {subtoolbar()}

                {rows.length === 0 ? (
                    !listUsers ? (
                        <Empty data-testid="empty-state">
                            <EmptyHeader>
                                <EmptyDescription className="kc-search-users-text">
                                    {t("searchForUserDescription")}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <ListEmptyState
                            message={t("noUsersFound")}
                            instructions={t("emptyInstructions")}
                            primaryActionText={t("createNewUser")}
                            onPrimaryAction={goToCreate}
                        />
                    )
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
                        <TablePagination table={table} />
                    </>
                )}
            </div>
        </>
    );
}
