/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/root/Root.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260601.0.0.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import { Suspense, useState } from "react";
import {
    createBrowserRouter,
    Outlet,
    type RouteObject,
    RouterProvider
} from "react-router-dom";
import {
    ErrorPage,
    type KeycloakContext,
    useEnvironment
} from "../../shared/keycloak-ui-shared";
import type { AccountEnvironment } from "..";
import fetchContentJson from "../content/fetchContent";
import { routes } from "../routes";
import { usePromise } from "../utils/usePromise";
import { Spinner as UiSpinner } from "@ui/components/spinner";
import { Header } from "./Header";
import { type MenuItem, PageNav } from "./PageNav";
import { Shell } from "./Shell";

function Spinner() {
    return (
        <div className="grid min-h-screen place-items-center bg-background">
            <UiSpinner className="size-6" />
        </div>
    );
}

function mapRoutes(
    context: KeycloakContext<AccountEnvironment>,
    content: MenuItem[]
): RouteObject[] {
    return content
        .map(item => {
            if ("children" in item) {
                return mapRoutes(context, item.children);
            }

            // Do not add route disabled via feature flags
            if (item.isVisible && !context.environment.features[item.isVisible]) {
                return null;
            }

            return {
                ...item,
                element:
                    "path" in item
                        ? routes.find(r => r.path === (item.id ?? item.path))?.element
                        : undefined
            };
        })
        .filter(item => !!item)
        .flat();
}

export const Root = () => {
    const context = useEnvironment<AccountEnvironment>();
    const [content, setContent] = useState<RouteObject[]>();

    usePromise(
        signal => fetchContentJson({ signal, context }),
        content => {
            setContent([
                {
                    path: decodeURIComponent(
                        new URL(context.environment.baseUrl).pathname
                    ),
                    element: (
                        <Shell header={<Header />} sidebar={<PageNav />}>
                            <Suspense fallback={<Spinner />}>
                                <Outlet />
                            </Suspense>
                        </Shell>
                    ),
                    errorElement: <ErrorPage />,
                    children: mapRoutes(context, content)
                }
            ]);
        }
    );

    if (!content) {
        return <Spinner />;
    }
    return <RouterProvider router={createBrowserRouter(content)} />;
};
