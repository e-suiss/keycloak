/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/resources/ResourcesTab.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import {
    ArrowSquareOutIcon,
    CaretDownIcon,
    CaretRightIcon,
    DotsThreeVerticalIcon,
    FolderIcon,
    PencilSimpleIcon,
    TrashIcon
} from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
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
import { Spinner } from "@ui/components/spinner";
import {
    Confirm,
    ConfirmAction,
    ConfirmCancel,
    ConfirmContent,
    ConfirmDescription,
    ConfirmFooter,
    ConfirmHeader,
    ConfirmTitle
} from "@ui/patterns/confirm";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";

import { fetchPermission, fetchResources, updatePermissions } from "../api";
import { getPermissionRequests } from "../api/methods";
import type { Links } from "../api/parse-links";
import type { Permission, Resource } from "../api/representations";
import { useAccountAlerts } from "../utils/useAccountAlerts";
import { usePromise } from "../utils/usePromise";
import { EditTheResource } from "./EditTheResource";
import { PermissionRequest } from "./PermissionRequest";
import { ResourceToolbar } from "./ResourceToolbar";
import { SharedWith } from "./SharedWith";
import { ShareTheResource } from "./ShareTheResource";

type PermissionDetail = {
    contextOpen?: boolean;
    rowOpen?: boolean;
    shareDialogOpen?: boolean;
    editDialogOpen?: boolean;
    permissions?: Permission[];
};

type ResourcesTabProps = {
    isShared?: boolean;
};

export const ResourcesTab = ({ isShared = false }: ResourcesTabProps) => {
    const { t } = useTranslation();
    const context = useEnvironment();
    const { addAlert, addError } = useAccountAlerts();

    const [params, setParams] = useState<Record<string, string>>({
        first: "0",
        max: "5"
    });
    const [links, setLinks] = useState<Links | undefined>();
    const [resources, setResources] = useState<Resource[]>();
    const [details, setDetails] = useState<Record<string, PermissionDetail | undefined>>(
        {}
    );
    const [unShareResource, setUnShareResource] = useState<Resource>();
    const [key, setKey] = useState(1);
    const refresh = () => setKey(key + 1);

    usePromise(
        async signal => {
            const result = await fetchResources({ signal, context }, params, isShared);
            if (!isShared)
                await Promise.all(
                    result.data.map(
                        async r =>
                            (r.shareRequests = await getPermissionRequests(r._id, {
                                signal,
                                context
                            }))
                    )
                );
            return result;
        },
        ({ data, links }) => {
            setResources(data);
            setLinks(links);
        },
        [params, key]
    );

    if (!resources) {
        return (
            <div className="grid place-items-center py-24">
                <Spinner />
            </div>
        );
    }

    const fetchPermissions = async (id: string) => {
        let permissions = details[id]?.permissions || [];
        if (!details[id]) {
            permissions = await fetchPermission({ context }, id);
        }
        return permissions;
    };

    const removeShare = async (resource: Resource) => {
        try {
            const permissions = (await fetchPermissions(resource._id)).map(
                ({ username }) =>
                    ({
                        username,
                        scopes: []
                    }) as Permission
            )!;
            await updatePermissions(context, resource._id, permissions);
            setDetails({});
            addAlert(t("unShareSuccess"));
        } catch (error) {
            addError("unShareError", error);
        }
    };

    const toggleOpen = async (
        id: string,
        field: keyof PermissionDetail,
        open: boolean
    ) => {
        const permissions = await fetchPermissions(id);

        setDetails({
            ...details,
            [id]: { ...details[id], [field]: open, permissions }
        });
    };

    return (
        <div className="space-y-6">
            <ResourceToolbar
                onFilter={name => setParams({ ...params, name })}
                count={resources.length}
                first={parseInt(params.first, 10)}
                max={parseInt(params.max, 10)}
                onNextClick={() => setParams(links?.next || {})}
                onPreviousClick={() => setParams(links?.prev || {})}
                onPerPageSelect={(first, max) =>
                    setParams({ first: `${first}`, max: `${max}` })
                }
                hasNext={!!links?.next}
            />

            {resources.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FolderIcon />
                        </EmptyMedia>
                        <EmptyTitle>{t("resources")}</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            ) : (
                <section>
                    <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                        {isShared ? t("sharedWithMe") : t("myResources")}
                    </h3>
                    <ItemGroup variant="inset">
                        {resources.map((resource, index) => {
                            const detail = details[resource._id];
                            const noPermissions = detail?.permissions?.length === 0;

                            const content = (
                                <ItemContent className="min-w-0">
                                    <ItemTitle data-testid={`row[${index}].name`}>
                                        {resource.name}
                                    </ItemTitle>
                                    <ItemDescription>
                                        <Button variant="link" size="xs" asChild>
                                            <a href={resource.client.baseUrl}>
                                                {resource.client.name ||
                                                    resource.client.clientId}
                                                <ArrowSquareOutIcon data-icon="inline-end" />
                                            </a>
                                        </Button>
                                    </ItemDescription>
                                </ItemContent>
                            );

                            return (
                                <Fragment key={resource.name}>
                                    {index > 0 && <ItemSeparator />}
                                    {isShared ? (
                                        <Item size="sm">
                                            <ItemMedia variant="icon">
                                                <FolderIcon />
                                            </ItemMedia>
                                            {content}
                                            {resource.scopes.length > 0 && (
                                                <ItemActions className="flex-wrap justify-end">
                                                    {resource.scopes.map(scope => (
                                                        <Badge
                                                            key={scope.name}
                                                            variant="outline"
                                                        >
                                                            {scope.displayName ||
                                                                scope.name}
                                                        </Badge>
                                                    ))}
                                                </ItemActions>
                                            )}
                                        </Item>
                                    ) : (
                                        <Item size="sm">
                                            <ItemMedia variant="icon">
                                                <FolderIcon />
                                            </ItemMedia>
                                            {content}
                                            <ItemActions>
                                                {resource.shareRequests &&
                                                    resource.shareRequests.length >
                                                        0 && (
                                                        <PermissionRequest
                                                            resource={resource}
                                                            refresh={() => refresh()}
                                                        />
                                                    )}
                                                <Button
                                                    variant="plain"
                                                    size="sm"
                                                    data-testid={`share-${resource.name}`}
                                                    onClick={() =>
                                                        toggleOpen(
                                                            resource._id,
                                                            "shareDialogOpen",
                                                            true
                                                        )
                                                    }
                                                >
                                                    {t("share")}
                                                </Button>
                                                <DropdownMenu
                                                    open={detail?.contextOpen || false}
                                                    onOpenChange={open =>
                                                        open
                                                            ? toggleOpen(
                                                                  resource._id,
                                                                  "contextOpen",
                                                                  true
                                                              )
                                                            : setDetails(d => ({
                                                                  ...d,
                                                                  [resource._id]: {
                                                                      ...d[resource._id],
                                                                      contextOpen: false
                                                                  }
                                                              }))
                                                    }
                                                >
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            aria-label={t("edit")}
                                                        >
                                                            <DotsThreeVerticalIcon weight="bold" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            disabled={noPermissions}
                                                            onSelect={async () => {
                                                                const permissions =
                                                                    await fetchPermissions(
                                                                        resource._id
                                                                    );
                                                                setDetails(d => ({
                                                                    ...d,
                                                                    [resource._id]: {
                                                                        ...d[resource._id],
                                                                        contextOpen: false,
                                                                        editDialogOpen: true,
                                                                        permissions
                                                                    }
                                                                }));
                                                            }}
                                                        >
                                                            <PencilSimpleIcon />
                                                            {t("edit")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            disabled={noPermissions}
                                                            onSelect={() =>
                                                                setUnShareResource(resource)
                                                            }
                                                        >
                                                            <TrashIcon />
                                                            {t("unShare")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    data-testid={`expand-${resource.name}`}
                                                    aria-label={t("resourceName")}
                                                    aria-expanded={detail?.rowOpen || false}
                                                    onClick={() =>
                                                        toggleOpen(
                                                            resource._id,
                                                            "rowOpen",
                                                            !detail?.rowOpen
                                                        )
                                                    }
                                                >
                                                    {detail?.rowOpen ? (
                                                        <CaretDownIcon />
                                                    ) : (
                                                        <CaretRightIcon />
                                                    )}
                                                </Button>
                                            </ItemActions>
                                        </Item>
                                    )}

                                    <ShareTheResource
                                        resource={resource}
                                        permissions={detail?.permissions}
                                        open={detail?.shareDialogOpen || false}
                                        onClose={() => setDetails({})}
                                    />
                                    {detail?.editDialogOpen && (
                                        <EditTheResource
                                            resource={resource}
                                            permissions={detail?.permissions}
                                            onClose={() => setDetails({})}
                                        />
                                    )}

                                    {!isShared && detail?.rowOpen && (
                                        <div className="px-4 pb-3 ps-14">
                                            <SharedWith permissions={detail?.permissions} />
                                        </div>
                                    )}
                                </Fragment>
                            );
                        })}
                    </ItemGroup>
                </section>
            )}

            <Confirm
                open={unShareResource !== undefined}
                onOpenChange={open => !open && setUnShareResource(undefined)}
            >
                <ConfirmContent>
                    <ConfirmHeader>
                        <ConfirmTitle>{t("unShare")}</ConfirmTitle>
                        <ConfirmDescription>{t("unShareAllConfirm")}</ConfirmDescription>
                    </ConfirmHeader>
                    <ConfirmFooter>
                        <ConfirmCancel>{t("cancel")}</ConfirmCancel>
                        <ConfirmAction
                            onClick={() => {
                                const resource = unShareResource;
                                setUnShareResource(undefined);
                                if (resource) removeShare(resource);
                            }}
                        >
                            {t("confirm")}
                        </ConfirmAction>
                    </ConfirmFooter>
                </ConfirmContent>
            </Confirm>
        </div>
    );
};
