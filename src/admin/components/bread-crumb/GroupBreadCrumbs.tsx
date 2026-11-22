/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/bread-crumb/GroupBreadCrumbs.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@ui/components/breadcrumb";
import { Fragment, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useGroupResource } from "../../context/group-resource/GroupResourceContext";
import { useRealm } from "../../context/realm-context/RealmContext";
import { useSubGroups } from "../../groups/SubGroupsContext";

export const GroupBreadCrumbs = () => {
    const { t } = useTranslation();
    const { clear, remove, subGroups } = useSubGroups();
    const { realm } = useRealm();
    const location = useLocation();

    const isOrgGroups = useGroupResource().isOrgGroups();
    const orgId = useGroupResource().getOrgId();
    const homePath = isOrgGroups
        ? `/${realm}/organizations/${orgId}/groups`
        : `/${realm}/groups`;

    useEffect(() => {
        const { pathname } = location;

        if (!pathname.includes("/groups") || pathname.endsWith("/groups")) {
            clear();
        }
    }, [location, clear]);

    return subGroups.length !== 0 ? (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem key="home">
                    <BreadcrumbLink asChild>
                        <Link to={homePath}>{t("groups")}</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {subGroups.map((group, i) => {
                    const isLastGroup = i === subGroups.length - 1;
                    return (
                        <Fragment key={group.id}>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {!isLastGroup && (
                                    <BreadcrumbLink asChild>
                                        <Link
                                            to={location.pathname.substring(
                                                0,
                                                location.pathname.indexOf(group.id!) +
                                                    group.id?.length
                                            )}
                                            onClick={() => remove(group)}
                                        >
                                            {group.name}
                                        </Link>
                                    </BreadcrumbLink>
                                )}
                                {isLastGroup && (
                                    <BreadcrumbPage>
                                        {group.id === "search"
                                            ? group.name
                                            : t("groupDetails")}
                                    </BreadcrumbPage>
                                )}
                            </BreadcrumbItem>
                        </Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    ) : null;
};
