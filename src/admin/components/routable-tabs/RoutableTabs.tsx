/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/routable-tabs/RoutableTabs.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import {
    Children,
    isValidElement,
    type JSXElementConstructor,
    type PropsWithChildren,
    type ReactElement,
    type ReactNode
} from "react";
import { useTranslation } from "react-i18next";
import {
    generatePath,
    matchPath,
    type Path,
    useHref,
    useLocation,
    useParams
} from "react-router-dom";
import { useServerInfo } from "../../context/server-info/ServerInfoProvider";
import { TAB_PROVIDER } from "../../page/constants";
import { PageHandler } from "../../page/PageHandler";
import useIsFeatureEnabled, { Feature } from "../../utils/useIsFeatureEnabled";

// Each tab child carries the route it points to (`eventKey`), its label
// (`title`), an optional anchor `href`, and the content to render when active.
type TabProps = {
    eventKey: number | string;
    title?: ReactNode;
    href?: string;
    children?: ReactNode;
    [key: string]: unknown;
};

type ChildElement = ReactElement<TabProps, JSXElementConstructor<TabProps>>;
type Child = ChildElement | boolean | null | undefined;

type RoutableTabsProps = {
    children: Child | Child[];
    defaultLocation?: Partial<Path>;
    className?: string;
};

export const RoutableTabs = ({
    children,
    defaultLocation,
    ...otherProps
}: RoutableTabsProps) => {
    const { pathname } = useLocation();
    const params = useParams();
    const { componentTypes } = useServerInfo();
    const tabs = componentTypes?.[TAB_PROVIDER] || [];
    const isFeatureEnabled = useIsFeatureEnabled();
    const { t } = useTranslation();

    const matchedTabs = tabs
        .filter(tab => matchPath({ path: tab.metadata.path }, pathname))
        .map(t => ({
            ...t,
            pathname: generatePath(t.metadata.path, {
                ...params,
                ...t.metadata.params
            })
        }));
    // Extract all keys from matchedTabs
    const matchedTabsKeys = matchedTabs.map(t => t.pathname);

    // Extract event keys from children
    const eventKeys = Children.toArray(children)
        .filter((child): child is ChildElement => isValidElement(child))
        .map(child => child.props.eventKey.toString());

    const allKeys = [...eventKeys, ...matchedTabsKeys];

    // Determine if there is an exact match.
    const exactMatch = allKeys.find(eventKey => eventKey === decodeURI(pathname));

    // Determine which event keys at least partially match the current path, then sort them so the nearest match ends up on top.
    const nearestMatch = eventKeys
        .filter(eventKey => pathname.includes(eventKey))
        .sort((a, b) => a.length - b.length)
        .pop();

    const activeKey = exactMatch ?? nearestMatch ?? defaultLocation?.pathname ?? pathname;

    // Collect the static <Tab> children alongside the dynamically matched tabs.
    const staticTabs = Children.toArray(children)
        .filter((child): child is ChildElement => isValidElement(child))
        .map(child => ({
            key: child.props.eventKey.toString(),
            title: child.props.title,
            href: child.props.href,
            content: child.props.children
        }));

    const dynamicTabs = isFeatureEnabled(Feature.DeclarativeUI)
        ? matchedTabs.map(tab => ({
              key: tab.pathname,
              title: t(tab.id),
              href: undefined,
              content: <PageHandler page={tab} providerType={TAB_PROVIDER} />
          }))
        : [];

    const tabItems = [...staticTabs, ...dynamicTabs];

    return (
        <Tabs value={activeKey} {...otherProps}>
            <TabsList variant="line" asChild>
                <nav>
                    {tabItems.map(tab => (
                        <TabsTrigger key={tab.key} value={tab.key} asChild>
                            <RoutableTab eventKey={tab.key} href={tab.href}>
                                {tab.title}
                            </RoutableTab>
                        </TabsTrigger>
                    ))}
                </nav>
            </TabsList>
            {tabItems.map(tab => (
                <TabsContent key={tab.key} value={tab.key}>
                    {tab.content}
                </TabsContent>
            ))}
        </Tabs>
    );
};

type RoutableTabProps = {
    eventKey: string;
    href?: string;
};

// Renders a tab trigger as a router-aware anchor, resolving the href from the
// event key when one isn't explicitly provided (mirrors useRoutableTab).
const RoutableTab = ({
    eventKey,
    href,
    children,
    ...props
}: PropsWithChildren<RoutableTabProps>) => {
    const resolvedHref = useHref(eventKey);

    return (
        <a href={href ?? resolvedHref} {...props}>
            {children}
        </a>
    );
};

export const useRoutableTab = (to: Partial<Path>) => ({
    eventKey: to.pathname ?? "",
    href: useHref(to)
});
